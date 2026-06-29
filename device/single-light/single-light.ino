// Meeting light — single-LED + dismiss-button ESP32 firmware.
//
// Behaviour:
//   * The LED turns RED 5 minutes before a meeting starts (window is set by
//     MEETING_WARN_MINUTES on the server).
//   * Press the button to dismiss it — the LED goes off and stays off for that
//     meeting.
//   * It re-arms automatically for the NEXT meeting and lights up again 5
//     minutes before that one. So with two back-to-back meetings, dismissing
//     the first still lets the second alert you in time to switch.
//
// "Which meeting did I already dismiss" is tracked by the meeting's calendar
// UID, reported by /api/status as `nextUid`, so dismissing meeting A never
// silences meeting B.
//
// Board: any ESP32 dev board. Arduino IDE: install "esp32 by Espressif", select
// your board, Upload. No extra libraries needed.

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#include "config.h"

static unsigned long lastPoll = 0;
static unsigned long lastBlink = 0;
static bool blinkOn = false;

// Latest data from the server.
static long nextStartsInSeconds = -1; // -1 = unknown / no meeting
static String nextUid = "";
static int warnMinutes = 5;
static bool online = false;

// The UID of the meeting whose alert the user dismissed.
static String dismissedUid = "";

// Button debounce.
static int lastButtonReading = HIGH;
static int stableButton = HIGH;
static unsigned long lastButtonChange = 0;

// ---- LED -------------------------------------------------------------------

static void writeLed(bool on) {
#if ACTIVE_LOW
  digitalWrite(PIN_LED, on ? LOW : HIGH);
#else
  digitalWrite(PIN_LED, on ? HIGH : LOW);
#endif
}

// True when a meeting is inside the warning window and hasn't been dismissed.
static bool isAlerting() {
  if (!online) return false;
  if (nextUid.length() == 0) return false;
  if (nextStartsInSeconds < 0) return false;
  if (nextStartsInSeconds > (long)warnMinutes * 60) return false;
  if (nextUid == dismissedUid) return false;
  return true;
}

// ---- JSON (tiny, no library) ----------------------------------------------

static String jsonString(const String &body, const char *key) {
  String pat = String("\"") + key + "\"";
  int i = body.indexOf(pat);
  if (i < 0) return "";
  int colon = body.indexOf(':', i + pat.length());
  if (colon < 0) return "";
  int q1 = body.indexOf('"', colon + 1);
  int q2 = body.indexOf('"', q1 + 1);
  if (q1 < 0 || q2 < 0) return "";
  return body.substring(q1 + 1, q2);
}

// Reads a numeric or null field. Returns the supplied default on null/missing.
static long jsonNumber(const String &body, const char *key, long fallback) {
  String pat = String("\"") + key + "\"";
  int i = body.indexOf(pat);
  if (i < 0) return fallback;
  int colon = body.indexOf(':', i + pat.length());
  if (colon < 0) return fallback;
  int j = colon + 1;
  while (j < (int)body.length() && (body[j] == ' ')) j++;
  if (body.startsWith("null", j)) return fallback;
  bool neg = false;
  if (body[j] == '-') { neg = true; j++; }
  long val = 0;
  bool any = false;
  while (j < (int)body.length() && body[j] >= '0' && body[j] <= '9') {
    val = val * 10 + (body[j] - '0');
    j++;
    any = true;
  }
  if (!any) return fallback;
  return neg ? -val : val;
}

// ---- WiFi ------------------------------------------------------------------

static void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    Serial.print(".");
    delay(100);
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? " connected" : " failed");
}

// ---- Polling ---------------------------------------------------------------

static void poll() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
    if (WiFi.status() != WL_CONNECTED) { online = false; return; }
  }

  String url = STATUS_URL;
  HTTPClient http;
  String body;
  bool ok = false;

  if (url.startsWith("https")) {
    WiFiClientSecure client;
    client.setInsecure(); // hobby device; pin a CA with setCACert() to harden.
    if (http.begin(client, url)) {
      http.setTimeout(8000);
      if (http.GET() == 200) { body = http.getString(); ok = true; }
      http.end();
    }
  } else {
    if (http.begin(url)) {
      http.setTimeout(8000);
      if (http.GET() == 200) { body = http.getString(); ok = true; }
      http.end();
    }
  }

  if (!ok) { online = false; return; }
  online = true;

  String newUid = jsonString(body, "nextUid");
  nextStartsInSeconds = jsonNumber(body, "nextStartsInSeconds", -1);
  warnMinutes = (int)jsonNumber(body, "warnMinutes", 5);

  // When the upcoming meeting changes, any earlier dismissal no longer applies.
  if (newUid != nextUid) {
    nextUid = newUid;
    if (dismissedUid != nextUid) dismissedUid = "";
  }

  Serial.printf("nextUid=%s in=%lds warn=%dm alerting=%d\n",
                nextUid.c_str(), nextStartsInSeconds, warnMinutes, isAlerting());
}

// ---- Button ----------------------------------------------------------------

static void handleButton() {
  int reading = digitalRead(PIN_BUTTON);
  if (reading != lastButtonReading) {
    lastButtonChange = millis();
    lastButtonReading = reading;
  }
  if (millis() - lastButtonChange > 40 && reading != stableButton) {
    stableButton = reading;
    if (stableButton == LOW) { // pressed (pull-up: pressed = LOW)
      if (isAlerting()) {
        dismissedUid = nextUid; // silence this meeting only
        Serial.printf("dismissed %s\n", dismissedUid.c_str());
      }
    }
  }
}

// ---- Arduino entry points --------------------------------------------------

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);

  // Boot self-test: blink the LED twice so you know it's wired right.
  for (int i = 0; i < 2; i++) { writeLed(true); delay(150); writeLed(false); delay(150); }

  connectWifi();
  poll();
  lastPoll = millis();
}

void loop() {
  unsigned long nowMs = millis();

  handleButton();

  if (nowMs - lastBlink >= 400) {
    lastBlink = nowMs;
    blinkOn = !blinkOn;
  }

  if (nowMs - lastPoll >= POLL_INTERVAL_MS) {
    poll();
    lastPoll = nowMs;
  }

  if (isAlerting()) {
#if BLINK_ALERT
    writeLed(blinkOn);
#else
    writeLed(true);
#endif
  } else {
    writeLed(false);
  }

  delay(10);
}
