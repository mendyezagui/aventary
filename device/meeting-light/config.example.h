// Copy this file to `config.h` and fill in your values. `config.h` is
// git-ignored so your WiFi password and token never get committed.
#pragma once

// --- WiFi -------------------------------------------------------------------
#define WIFI_SSID      "your-wifi-name"
#define WIFI_PASSWORD  "your-wifi-password"

// --- Status endpoint --------------------------------------------------------
// The deployed /api/status URL. Include the token query param if you set
// MEETING_STATUS_TOKEN on the server.
#define STATUS_URL     "https://www.aventary.com/api/status?token=YOUR_TOKEN"

// How often to poll, in milliseconds (20s is a good balance).
#define POLL_INTERVAL_MS  20000

// --- Wiring (GPIO pin -> LED) ----------------------------------------------
// These are safe, commonly-broken-out pins on most ESP32 dev boards.
#define PIN_RED     25
#define PIN_YELLOW  26
#define PIN_GREEN   27

// Set to 1 if your LEDs are wired common-anode (pin LOW = on). Default 0 is
// the usual "GPIO -> resistor -> LED -> GND" wiring (pin HIGH = on).
#define ACTIVE_LOW  0

// Blink the yellow lamp instead of holding it solid, to grab attention in the
// 5 minutes before a meeting. Set to 0 for a steady light.
#define BLINK_YELLOW  1
