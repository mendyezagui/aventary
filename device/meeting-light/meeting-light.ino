// Meeting traffic-light — ESP32 firmware.
//
// Polls the Aventary /api/status endpoint over WiFi and drives three LEDs:
//   green  = clear            (no meeting imminent)
//   yellow = starting soon    (meeting within MEETING_WARN_MINUTES)
//   red    = in a meeting     (one is happening now)
//
// Error signalling: while connecting to WiFi the green LED blinks slowly. If a
// poll fails (no WiFi, server down, bad response) all three LEDs blink together
// so a stuck "clear" light never fools you into thinking you're free.
//
// Board: any ESP32 dev board. Arduino IDE: install "esp32 by Espressif" boards,
// select your board, then Upload. No extra libraries needed — JSON is matched
// by a tiny string search so there's nothing to install.

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#include "config.h"

enum State { STATE_GREEN, STATE_YELLOW, STATE_RED, STATE_ERROR };

static unsigned long lastPoll = 0;
static unsigned long lastBlink = 0;
static bool blinkOn = false;
static State currentState = STATE_ERROR;

// ---- LED helpers -----------------------------------------------------------

static void writePin(int pin, bool on) {
#if ACTIVE_LOW
  digitalWrite(pin, on ? LOW : HIGH);
#else
  digitalWrite(pin, on ? HIGH : LOW);
#endif
}

static void setLeds(bool red, bool yellow, bool green) {
  writePin(PIN_RED, red);
  writePin(PIN_YELLOW, yellow);
  writePin(PIN_GREEN, green);
}

// Render the current state, including any blinking, every loop iteration.
static void renderState() {
  switch (currentState) {
    case STATE_RED:
      setLeds(true, false, false);
      break;
    case STATE_GREEN:
      setLeds(false, false, true);
      break;
    case STATE_YELLOW:
#if BLINK_YELLOW
      setLeds(false, blinkOn, false);
#else
      setLeds(false, true, false);
#endif
      break;
    case STATE_ERROR:
      // All three blink together: "I don't know your status".
      setLeds(blinkOn, blinkOn, blinkOn);
      break;
  }
}

// ---- WiFi ------------------------------------------------------------------

static void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    // Slow green blink while connecting.
    writePin(PIN_GREEN, (millis() / 400) % 2);
    Serial.print(".");
    delay(50);
  }
  writePin(PIN_GREEN, false);
  Serial.println(WiFi.status() == WL_CONNECTED ? " connected" : " failed");
}

// ---- Polling ---------------------------------------------------------------

// Extract the value of "state" from the JSON body without a JSON library.
static State parseState(const String &body) {
  int i = body.indexOf("\"state\"");
  if (i < 0) return STATE_ERROR;
  int colon = body.indexOf(':', i);
  if (colon < 0) return STATE_ERROR;
  int q1 = body.indexOf('"', colon + 1);
  int q2 = body.indexOf('"', q1 + 1);
  if (q1 < 0 || q2 < 0) return STATE_ERROR;
  String value = body.substring(q1 + 1, q2);
  if (value == "red") return STATE_RED;
  if (value == "yellow") return STATE_YELLOW;
  if (value == "green") return STATE_GREEN;
  return STATE_ERROR;
}

static void poll() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
    if (WiFi.status() != WL_CONNECTED) {
      currentState = STATE_ERROR;
      return;
    }
  }

  String url = STATUS_URL;
  HTTPClient http;
  bool ok = false;

  if (url.startsWith("https")) {
    WiFiClientSecure client;
    // Skip cert validation — fine for a hobby device on your own network.
    // For stricter security, pin the server's root CA with client.setCACert().
    client.setInsecure();
    if (http.begin(client, url)) {
      http.setTimeout(8000);
      int code = http.GET();
      if (code == 200) {
        currentState = parseState(http.getString());
        ok = true;
      } else {
        Serial.printf("HTTP %d\n", code);
      }
      http.end();
    }
  } else {
    if (http.begin(url)) {
      http.setTimeout(8000);
      int code = http.GET();
      if (code == 200) {
        currentState = parseState(http.getString());
        ok = true;
      } else {
        Serial.printf("HTTP %d\n", code);
      }
      http.end();
    }
  }

  if (!ok) currentState = STATE_ERROR;
  Serial.printf("state=%d\n", currentState);
}

// ---- Arduino entry points --------------------------------------------------

void setup() {
  Serial.begin(115200);
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_YELLOW, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);

  // Quick lamp test on boot so you can confirm the wiring: R, Y, G in turn.
  setLeds(true, false, false); delay(300);
  setLeds(false, true, false); delay(300);
  setLeds(false, false, true); delay(300);
  setLeds(false, false, false);

  connectWifi();
  poll();
  lastPoll = millis();
}

void loop() {
  unsigned long nowMs = millis();

  // Toggle the blink phase ~ twice a second.
  if (nowMs - lastBlink >= 500) {
    lastBlink = nowMs;
    blinkOn = !blinkOn;
  }

  // Poll on the configured interval (millis() rollover-safe).
  if (nowMs - lastPoll >= POLL_INTERVAL_MS) {
    poll();
    lastPoll = nowMs;
  }

  renderState();
  delay(20);
}
