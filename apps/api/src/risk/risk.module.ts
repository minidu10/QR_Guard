import { Module } from '@nestjs/common';
import { ShopsModule } from '../shops/shops.module';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';

@Module({
  imports: [ShopsModule],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
