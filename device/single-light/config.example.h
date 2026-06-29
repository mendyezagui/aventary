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

// How often to poll, in milliseconds.
#define POLL_INTERVAL_MS  20000

// --- Wiring -----------------------------------------------------------------
// One LED and one push button.
//   LED:    GPIO -> resistor (220-330 ohm) -> LED(+) , LED(-) -> GND
//   Button: GPIO -> button -> GND   (uses the chip's internal pull-up)
#define PIN_LED     25
#define PIN_BUTTON  4

// Set to 1 if your LED is wired common-anode (pin LOW = on). Default 0 is the
// usual "GPIO -> resistor -> LED -> GND" wiring (pin HIGH = on).
#define ACTIVE_LOW  0

// Blink the LED instead of holding it solid, so it's harder to ignore.
#define BLINK_ALERT  1
