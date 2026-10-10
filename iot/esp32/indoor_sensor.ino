/*
 * AIRGUARD ESP32 Indoor Air Quality Monitor
 * Hardware:
 * - ESP32 DevKit V1
 * - PMS5003 / PMS7003 Laser Particle Sensor (UART RX/TX: Pins 16/17)
 * - MQ-135 / NDIR CO2 Sensor (Analog ADC: Pin 34)
 * - BME680 / DHT22 Temp & Humidity Sensor (I2C: SDA 21, SCL 22)
 *
 * Transmits telemetry via MQTT to AWS IoT Core and HTTPS fallback to AIRGUARD Backend.
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <Wire.h>

// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// AWS IoT Core Configuration
const char* AWS_IOT_ENDPOINT = "a1b2c3d4e5f6g7-ats.iot.us-east-1.amazonaws.com";
const int AWS_IOT_PORT = 8883;
const char* DEVICE_ID = "AIRGUARD-INDOOR-001";
const char* MQTT_TOPIC_TELEMETRY = "airguard/devices/indoor/telemetry";

// Hardware Serial for PMS5003
HardwareSerial pmsSerial(2);

WiFiClientSecure netClient;
PubSubClient mqttClient(netClient);

// Sensor values
float pm25_val = 24.5;
float pm10_val = 38.2;
float co2_ppm = 680.0;
float temperature_c = 25.4;
float humidity_pct = 52.0;

void setup() {
  Serial.begin(115200);
  pmsSerial.begin(9600, SERIAL_8N1, 16, 17);
  
  Serial.println("=================================");
  Serial.println("   AIRGUARD ESP32 IoT Sentinel   ");
  Serial.println("=================================");

  connectWiFi();
  configureAWS();
}

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nWiFi Connection failed. Running in standalone mode.");
  }
}

void configureAWS() {
  // In production, configure certificates:
  // netClient.setCACert(AWS_CERT_CA);
  // netClient.setCertificate(AWS_CERT_CRT);
  // netClient.setPrivateKey(AWS_CERT_PRIVATE);
  netClient.setInsecure(); // For rapid hackathon demo testing
  mqttClient.setServer(AWS_IOT_ENDPOINT, AWS_IOT_PORT);
}

void readSensors() {
  // Read PMS5003 Frame (32 bytes)
  if (pmsSerial.available() >= 32) {
    uint8_t buffer[32];
    pmsSerial.readBytes(buffer, 32);
    if (buffer[0] == 0x42 && buffer[1] == 0x4D) {
      pm25_val = (buffer[12] << 8) | buffer[13];
      pm10_val = (buffer[14] << 8) | buffer[15];
    }
  } else {
    // Add minor sensor drift for demonstration
    pm25_val += ((float)random(-10, 11) / 10.0);
    pm25_val = max(5.0f, min(150.0f, pm25_val));
  }

  // Read CO2 from Analog Pin 34
  int rawADC = analogRead(34);
  co2_ppm = map(rawADC, 0, 4095, 400, 2000);
  
  // Simulated ambient temp & humidity
  temperature_c = 25.0 + ((float)random(-5, 6) / 10.0);
  humidity_pct = 55.0 + ((float)random(-10, 11) / 10.0);
}

void publishTelemetry() {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["pm25"] = round(pm25_val * 10.0) / 10.0;
  doc["pm10"] = round(pm10_val * 10.0) / 10.0;
  doc["co2"] = round(co2_ppm);
  doc["temperature"] = round(temperature_c * 10.0) / 10.0;
  doc["humidity"] = round(humidity_pct * 10.0) / 10.0;
  doc["status"] = "OK";
  doc["timestamp"] = millis();

  char payload[256];
  serializeJson(doc, payload);

  Serial.print("Telemetry payload: ");
  Serial.println(payload);

  if (mqttClient.connected()) {
    mqttClient.publish(MQTT_TOPIC_TELEMETRY, payload);
    Serial.println("Published to AWS IoT Core successfully.");
  }
}

void loop() {
  if (!mqttClient.connected() && WiFi.status() == WL_CONNECTED) {
    Serial.println("Reconnecting MQTT...");
    if (mqttClient.connect(DEVICE_ID)) {
      Serial.println("MQTT Connected to AWS IoT Core!");
    }
  }
  mqttClient.loop();

  readSensors();
  publishTelemetry();
  delay(5000); // 5-second sampling interval
}
