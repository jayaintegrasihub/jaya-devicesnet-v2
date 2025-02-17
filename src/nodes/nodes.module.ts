import { Module } from '@nestjs/common';
import { NodesController } from './nodes.controller';
import { NodesService } from './nodes.service';
import { AuthModule } from 'src/auth/auth.module';
import { CacheModule } from '@nestjs/cache-manager';
import { InfluxdbClientModule } from 'src/influxdb/influxdb.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    AuthModule,
    CacheModule.register(),
    InfluxdbClientModule,
    RedisModule,
  ],
  controllers: [NodesController],
  providers: [NodesService],
  exports: [NodesService],
})
export class NodesModule {}
