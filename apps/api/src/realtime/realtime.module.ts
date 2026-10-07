import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeController } from './realtime.controller';
import { RealtimeGateway } from './realtime.gateway';

// Global, so any module can send live updates.
@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [RealtimeController],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
