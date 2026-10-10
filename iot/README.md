# AIRGUARD IoT Indoor Air Quality Monitor

## Hardware Requirements

- **ESP32 DevKit** (ESP32-WROOM-32)
- **PMS5003** Particulate Matter Sensor (PM2.5, PM10)
- **BME680** Environmental Sensor (Temperature, Humidity, VOC)
- **MQ-135** Air Quality Sensor (CO2 approximation)
- Breadboard and jumper wires
- 5V power supply

## Wiring Diagram

### PMS5003
- VCC → 5V
- GND → GND
- TX → GPIO 16 (ESP32 RX)
- RX → GPIO 17 (ESP32 TX)

### BME680 (I2C)
- VCC → 3.3V
- GND → GND
- SDA → GPIO 21
- SCL → GPIO 22

### MQ-135
- VCC → 5V
- GND → GND
- AOUT → GPIO 34 (Analog)

## Setup Instructions

1. **Install Arduino IDE**
   - Download from https://www.arduino.cc/en/software

2. **Install ESP32 Board Support**
   ```
   File → Preferences → Additional Board Manager URLs:
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   
   Tools → Board → Boards Manager → Search "ESP32" → Install
   ```

3. **Install Required Libraries**
   - ArduinoJson (by Benoit Blanchon)
   - WiFi (included with ESP32)
   - HTTPClient (included with ESP32)
   - Wire (included with ESP32)

4. **Configure WiFi and API**
   - Edit `indoor_sensor.ino`
   - Update `WIFI_SSID` and `WIFI_PASSWORD`
   - Update `API_URL` with your backend URL
   - Set unique `DEVICE_ID`

5. **Upload Firmware**
   ```
   Tools → Board → ESP32 Dev Module
   Tools → Port → Select your ESP32 port
   Sketch → Upload
   ```

6. **Monitor Serial Output**
   ```
   Tools → Serial Monitor
   Set baud rate to 115200
   ```

## Data Format

The device sends readings every minute via HTTP POST:

```json
{
  "device_id": "esp32_001",
  "timestamp": "2024-01-01T12:00:00Z",
  "pm25": 35.5,
  "pm10": 50.2,
  "temperature": 23.5,
  "humidity": 45.0,
  "co2": 650,
  "tvoc": 150
}
```

## Troubleshooting

- **WiFi not connecting**: Check SSID/password, signal strength
- **No sensor readings**: Verify wiring, check serial monitor for errors
- **Data not uploading**: Verify API URL, check network connectivity
- **Erratic readings**: Allow 24h warmup for gas sensors (MQ-135)

## Power Consumption

- Active mode: ~150mA
- Deep sleep mode: ~10µA (future implementation)

## Future Enhancements

- Deep sleep mode for battery operation
- MQTT for real-time streaming
- Local display (OLED)
- OTA firmware updates
- Multiple sensor calibration profiles
