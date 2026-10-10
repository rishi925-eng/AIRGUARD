/**
 * AIRGUARD Indoor Air Quality Monitor
 * ESP32 firmware for monitoring indoor air quality
 * 
 * Sensors:
 * - PMS5003: PM2.5 and PM10
 * - BME680: Temperature, Humidity, VOC
 * - MQ-135: Air Quality (CO2 approximation)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>

// WiFi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// API configuration
const char* API_URL = "http://your-backend-url/api/iot/readings";
const char* DEVICE_ID = "esp32_001";

// Sensor pins
#define PMS_RX_PIN 16
#define PMS_TX_PIN 17
#define MQ135_PIN 34
#define BME680_SDA 21
#define BME680_SCL 22

// Reading interval (milliseconds)
const unsigned long READING_INTERVAL = 60000; // 1 minute

// Data structure
struct SensorData {
  float pm25;
  float pm10;
  float temperature;
  float humidity;
  int co2;
  int tvoc;
};

SensorData currentData;
unsigned long lastReading = 0;

void setup() {
  Serial.begin(115200);
  
  // Initialize sensors
  initSensors();
  
  // Connect to WiFi
  connectWiFi();
  
  Serial.println("AIRGUARD Indoor Monitor Ready");
}

void loop() {
  unsigned long currentMillis = millis();
  
  // Take reading at interval
  if (currentMillis - lastReading >= READING_INTERVAL) {
    lastReading = currentMillis;
    
    // Read all sensors
    readSensors();
    
    // Send data to server
    sendData();
    
    // Print to serial for debugging
    printData();
  }
  
  delay(1000);
}

void initSensors() {
  // Initialize PMS5003
  Serial2.begin(9600, SERIAL_8N1, PMS_RX_PIN, PMS_TX_PIN);
  
  // Initialize I2C for BME680
  Wire.begin(BME680_SDA, BME680_SCL);
  
  Serial.println("Sensors initialized");
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnected to WiFi");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect to WiFi");
  }
}

void readSensors() {
  // Read PMS5003
  readPMS5003();
  
  // Read BME680
  readBME680();
  
  // Read MQ-135
  readMQ135();
}

void readPMS5003() {
  // Simplified PMS5003 reading
  // In production, implement full protocol
  if (Serial2.available() >= 32) {
    byte buffer[32];
    Serial2.readBytes(buffer, 32);
    
    // Parse PM2.5 and PM10 (simplified)
    currentData.pm25 = (buffer[10] << 8) | buffer[11];
    currentData.pm10 = (buffer[12] << 8) | buffer[13];
  } else {
    // Mock data for testing
    currentData.pm25 = random(5, 50);
    currentData.pm10 = random(10, 100);
  }
}

void readBME680() {
  // Mock data - in production, use BME680 library
  currentData.temperature = random(20, 30);
  currentData.humidity = random(40, 60);
  currentData.tvoc = random(0, 500);
}

void readMQ135() {
  // Read analog value from MQ-135
  int rawValue = analogRead(MQ135_PIN);
  
  // Convert to approximate CO2 ppm (simplified)
  currentData.co2 = map(rawValue, 0, 4095, 400, 2000);
}

void sendData() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, skipping upload");
    return;
  }
  
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["timestamp"] = String(millis());
  doc["pm25"] = currentData.pm25;
  doc["pm10"] = currentData.pm10;
  doc["temperature"] = currentData.temperature;
  doc["humidity"] = currentData.humidity;
  doc["co2"] = currentData.co2;
  doc["tvoc"] = currentData.tvoc;
  
  String payload;
  serializeJson(doc, payload);
  
  // Send POST request
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    Serial.print("Data sent successfully. Response code: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.print("Error sending data. Error code: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}

void printData() {
  Serial.println("\n=== Sensor Readings ===");
  Serial.print("PM2.5: ");
  Serial.print(currentData.pm25);
  Serial.println(" µg/m³");
  
  Serial.print("PM10: ");
  Serial.print(currentData.pm10);
  Serial.println(" µg/m³");
  
  Serial.print("Temperature: ");
  Serial.print(currentData.temperature);
  Serial.println(" °C");
  
  Serial.print("Humidity: ");
  Serial.print(currentData.humidity);
  Serial.println(" %");
  
  Serial.print("CO2: ");
  Serial.print(currentData.co2);
  Serial.println(" ppm");
  
  Serial.print("TVOC: ");
  Serial.print(currentData.tvoc);
  Serial.println(" ppb");
  Serial.println("======================\n");
}
