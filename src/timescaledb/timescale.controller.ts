import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { TimescaleService } from './timescale.service';

@Controller('timescale')
@UseInterceptors(ClassSerializerInterceptor)
export class TimescaleController {
  constructor(private timescaleService: TimescaleService) {}

  @Post('migrate')
  async migrate() {
    await this.timescaleService.createSchema();
    return { message: 'Migration completed' };
  }

  @Post('seed')
  async seedData() {
    await this.timescaleService.seedData();
    return { message: 'Data seeded' };
  }
  
  @Post('migrate_tenant')
  async migrateTenant(@Body('tenant') tenant: string) {
    await this.timescaleService.createTenantSchema(tenant);
    return { message: 'Migration completed' };
  }

  @Post('seed_tenant')
  async seedDataTenant(@Body('tenant') tenant: string) {
    await this.timescaleService.seedTenantData(tenant);
    return { message: 'Data seeded' };
  }
}
