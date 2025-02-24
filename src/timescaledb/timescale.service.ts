import { Injectable, Logger } from '@nestjs/common';
import { TimescaleProvider } from './timescale.provider';

@Injectable()
export class TimescaleService {
  private readonly logger = new Logger(TimescaleService.name);

  constructor(
    private timescaleProvider: TimescaleProvider,
  ) {  }

  async createSchema(): Promise<void> {
    try {
      await this.timescaleProvider.query(`
        -- Create extension if not exists
        CREATE EXTENSION IF NOT EXISTS timescaledb;

        -- Create device telemetry table
        CREATE TABLE IF NOT EXISTS device_telemetry (
          time TIMESTAMPTZ NOT NULL,
          device_id VARCHAR(30) NOT NULL,
          measurement VARCHAR(50) NOT NULL,
          field VARCHAR(50) NOT NULL,
          value DOUBLE PRECISION,
          tenant_id UUID NOT NULL,
          tags JSONB,
          FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id)
        );

        -- Create device health table
        CREATE TABLE IF NOT EXISTS device_health (
          time TIMESTAMPTZ NOT NULL,
          device_id VARCHAR(30) NOT NULL,
          uptime INTEGER,
          status VARCHAR(20),
          tenant_id UUID NOT NULL,
          FOREIGN KEY (tenant_id) REFERENCES "Tenants"(id)
        );

        -- Create hypertables
        SELECT create_hypertable('device_telemetry', 'time', if_not_exists => TRUE);
        SELECT create_hypertable('device_health', 'time', if_not_exists => TRUE);

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_device_telemetry_device 
        ON device_telemetry(device_id, time DESC);
        
        CREATE INDEX IF NOT EXISTS idx_device_health_device 
        ON device_health(device_id, time DESC);
      `);
      
      this.logger.log('TimescaleDB schema created successfully');
    } catch (error) {
      this.logger.error('Failed to create TimescaleDB schema:', error);
      throw error;
    }
  }
  async seedData(): Promise<void> {
    try {
      await this.timescaleProvider.query(`
        -- Seed device telemetry data
        INSERT INTO device_telemetry (time, device_id, measurement, field, value, tenant_id, tags)
        VALUES 
          (NOW(), 'MMA2CBCBB0CF8B8', 'QC', 'temp', 23.5, '07cc4859-64a1-45a7-bcd4-ba0d222708d5', '{"location": "office"}'),
          (NOW(), 'MMACC7B5CA69334', 'QC', 'hum', 45.2, '00000000-0000-0000-0000-000000000002', '{"location": "warehouse"}'),
          ('2025-01-29T09:01:42Z', 'MMA2CBCBB0CF8B8', 'QC', 'RPM', 0, '07cc4859-64a1-45a7-bcd4-ba0d222708d5', '{"gateway": "HUBF09E9E0D8294"}'),
          ('2025-01-29T09:01:42Z', 'MMA2CBCBB0CF8B8', 'QC', 'Test', 0, '07cc4859-64a1-45a7-bcd4-ba0d222708d5', '{"gateway": "HUBF09E9E0D8294"}'),
          ('2025-01-24T02:02:31Z', 'MMA2CBCBB0CF8B8', 'QC', 'Test1', 100, '07cc4859-64a1-45a7-bcd4-ba0d222708d5', '{"gateway": "HUBF09E9E0D8294"}'),
          ('2025-01-24T02:02:31Z', 'MMA2CBCBB0CF8B8', 'QC', 'Test2', 200, '07cc4859-64a1-45a7-bcd4-ba0d222708d5', '{"gateway": "HUBF09E9E0D8294"}'),
          ('2025-01-21T04:53:26Z', 'MMA2CBCBB0CF8B8', 'QC', 'TestRPM', 0, '07cc4859-64a1-45a7-bcd4-ba0d222708d5', '{"gateway": "HUBF09E9E0D8294"}'),
          ('2025-01-21T04:53:26Z', 'MMA2CBCBB0CF8B8', 'QC', 'TestSwitc', 0, '07cc4859-64a1-45a7-bcd4-ba0d222708d5', '{"gateway": "HUBF09E9E0D8294"}'),
          ('2025-01-24T02:02:19Z', 'MMA2CBCBB0CF8B8', 'QC', 'TestTCP1', 1000, '07cc4859-64a1-45a7-bcd4-ba0d222708d5', '{"gateway": "HUBF09E9E0D8294"}'),
          ('2025-01-24T02:02:19Z', 'MMA2CBCBB0CF8B8', 'QC', 'TestTCP2', 2000, '07cc4859-64a1-45a7-bcd4-ba0d222708d5', '{"gateway": "HUBF09E9E0D8294"}'),
          ('2025-01-21T08:49:48Z', 'MMA2CBCBB0CF8B8', 'QC', 'cDecimal', 2801810943, '07cc4859-64a1-45a7-bcd4-ba0d222708d5', '{"gateway": "MMA2CBCBB0CF8B8"}'),
          ('2025-01-21T08:49:48Z', 'MMA2CBCBB0CF8B8', 'QC', 'cFloat', 4283318625, '07cc4859-64a1-45a7-bcd4-ba0d222708d5', '{"gateway": "MMA2CBCBB0CF8B8"}'),
          ('2025-01-21T08:49:48Z', 'MMA2CBCBB0CF8B8', 'QC', 'flowrate', 0, '07cc4859-64a1-45a7-bcd4-ba0d222708d5', '{"gateway": "MMA2CBCBB0CF8B8"}');

        -- Seed device health data
        INSERT INTO device_health (time, device_id, uptime, status, tenant_id)
        VALUES 
          (NOW(), 'MMA2CBCBB0CF8B8', 123456, 'online', '07cc4859-64a1-45a7-bcd4-ba0d222708d5'),
          (NOW(), 'MMACC7B5CA69334', 654321, 'offline', '00000000-0000-0000-0000-000000000002'),
          ('2025-02-05T09:39:29Z', 'MMA2CBCBB0CF8B8', 14, 'OFFLINE', '07cc4859-64a1-45a7-bcd4-ba0d222708d5');
      `);

      this.logger.log('TimescaleDB data seeded successfully');
    } catch (error) {
      this.logger.error('Failed to seed TimescaleDB data:', error);
      throw error;
    }
  }

  async createTenantSchema(tenantName: string): Promise<void> {
    try {
      await this.timescaleProvider.query(`
        CREATE EXTENSION IF NOT EXISTS timescaledb;
      `);

      await this.timescaleProvider.query(`
        CREATE TABLE IF NOT EXISTS device_telemetry_${tenantName} (
          time TIMESTAMPTZ NOT NULL,
          device VARCHAR(30) NOT NULL,
          floor INTEGER NOT NULL,
          oxygen_input DOUBLE PRECISION,
          oxygen_output DOUBLE PRECISION,
          pressure DOUBLE PRECISION,
          flow_rate DOUBLE PRECISION,
          temperature DOUBLE PRECISION,
          humidity DOUBLE PRECISION,
          room_number VARCHAR(10),
          department VARCHAR(50),
          notes TEXT
        );
      `);
  
      await this.timescaleProvider.query(`
        CREATE TABLE IF NOT EXISTS device_health_${tenantName} (
          time TIMESTAMPTZ NOT NULL,
          device VARCHAR(30) NOT NULL,
          battery_level DOUBLE PRECISION,
          battery_voltage DOUBLE PRECISION,
          device_status VARCHAR(20),
          connection_strength INTEGER,
          last_maintenance TIMESTAMPTZ,
          firmware_version VARCHAR(20),
          error_code VARCHAR(20),
          uptime INTEGER,
          temperature DOUBLE PRECISION,
          memory_usage DOUBLE PRECISION
        );
      `);

      await this.timescaleProvider.query(`
        SELECT create_hypertable('device_telemetry_${tenantName}', 'time', if_not_exists => TRUE);
        SELECT create_hypertable('device_health_${tenantName}', 'time', if_not_exists => TRUE);
      `);

      await this.timescaleProvider.query(`
        CREATE INDEX IF NOT EXISTS idx_device_telemetry_${tenantName}_device 
        ON device_telemetry_${tenantName}(device, time DESC);
        
        CREATE INDEX IF NOT EXISTS idx_device_telemetry_${tenantName}_floor 
        ON device_telemetry_${tenantName}(floor, time DESC);
        
        CREATE INDEX IF NOT EXISTS idx_device_health_${tenantName}_device 
        ON device_health_${tenantName}(device, time DESC);
        
        CREATE INDEX IF NOT EXISTS idx_device_health_${tenantName}_status 
        ON device_health_${tenantName}(device_status, time DESC);
      `);
      
      this.logger.log(`TimescaleDB schema created successfully for tenant: ${tenantName}`);
    } catch (error) {
      this.logger.error(`Failed to create TimescaleDB schema for tenant ${tenantName}:`, error);
      throw error;
    }
  }
  
  async seedTenantData(tenantName: string): Promise<void> {
    try {
      await this.timescaleProvider.query(`
        -- Seed device telemetry data
        INSERT INTO device_telemetry_${tenantName} (
          time,
          device,
          floor,
          oxygen_input,
          oxygen_output,
          pressure,
          flow_rate,
          temperature,
          humidity,
          room_number,
          department,
          notes
        )
        VALUES 
          (NOW(), 'DEV001', 1, 95.5, 92.3, 1013.2, 15.7, 23.5, 45.0, 'ICU-101', 'ICU', 'Normal operation'),
          (NOW(), 'DEV002', 2, 94.8, 91.5, 1012.8, 14.3, 24.1, 46.2, 'OR-201', 'Surgery', 'Post-maintenance check'),
          ('2025-01-29T09:01:42Z', 'DEV003', 3, 96.2, 93.1, 1013.5, 16.2, 22.8, 44.5, 'ER-301', 'Emergency', 'High traffic period'),
          ('2025-01-24T02:02:31Z', 'DEV004', 1, 95.1, 91.8, 1012.5, 15.1, 23.2, 45.5, 'ICU-102', 'ICU', 'Routine monitoring'),
          ('2025-01-21T04:53:26Z', 'DEV005', 2, 94.5, 90.8, 1013.0, 14.8, 24.5, 47.0, 'OR-202', 'Surgery', 'System calibration');
  
        -- Seed device health data
        INSERT INTO device_health_${tenantName} (
          time,
          device,
          battery_level,
          battery_voltage,
          device_status,
          connection_strength,
          last_maintenance,
          firmware_version,
          error_code,
          uptime,
          temperature,
          memory_usage
        )
        VALUES 
          (NOW(), 'DEV001', 85.5, 3.7, 'ONLINE', 95, '2025-01-01T00:00:00Z', 'v2.1.0', NULL, 123456, 35.2, 45.6),
          (NOW(), 'DEV002', 72.3, 3.6, 'ONLINE', 87, '2025-01-15T00:00:00Z', 'v2.1.0', NULL, 98765, 36.1, 52.3),
          ('2025-01-29T09:01:42Z', 'DEV003', 15.2, 3.2, 'LOW_BATTERY', 91, '2025-01-10T00:00:00Z', 'v2.0.9', 'BAT_LOW', 45678, 34.8, 48.9),
          ('2025-01-24T02:02:31Z', 'DEV004', 0.0, 0.0, 'OFFLINE', 0, '2024-12-28T00:00:00Z', 'v2.1.0', 'CONN_LOST', 0, 0.0, 0.0),
          ('2025-01-21T04:53:26Z', 'DEV005', 91.2, 3.8, 'ONLINE', 98, '2025-01-20T00:00:00Z', 'v2.1.1', NULL, 234567, 35.5, 43.2);
      `);
      
      this.logger.log(`Seed data inserted successfully for tenant: ${tenantName}`);
    } catch (error) {
      this.logger.error(`Failed to seed data for tenant ${tenantName}:`, error);
      throw error;
    }
  }
}