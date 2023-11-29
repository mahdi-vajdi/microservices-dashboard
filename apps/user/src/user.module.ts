import { Module } from '@nestjs/common';
import { UserController } from './Presentation/nats-user.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { MongooseModule } from '@nestjs/mongoose';
import {
  USER_DB_COLLECTION,
  UserSchema,
} from './Infrastructure/models/user.model';
import { CqrsModule } from '@nestjs/cqrs';
import { UserCommandHandlers } from './Application/commands/handlers';
import { UserQueryHandlers } from './Application/queries/handlers';
import { UserEventHandlers } from './Application/events/handlers';
import { MongoUserQueryRepository } from './Infrastructure/repositories/user.query-repo';
import { UserEntityRepositoryImpl } from './Infrastructure/repositories/impl-user.entity-repo';
import { UserEntityRepository } from './Domain/base-user.entity-repo';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AGENT_SERVICE } from '@app/common';

@Module({
  imports: [
    CqrsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        HTTP_PORT: Joi.number().required(),
        NATS_URI: Joi.string().required(),
        MONGODB_URI: Joi.string().required(),
      }),
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: USER_DB_COLLECTION, schema: UserSchema },
    ]),
    ClientsModule.registerAsync([
      {
        name: AGENT_SERVICE,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [configService.getOrThrow('NATS_URI')],
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [UserController],
  providers: [
    MongoUserQueryRepository,
    { provide: UserEntityRepository, useClass: UserEntityRepositoryImpl },
    ...UserCommandHandlers,
    ...UserEventHandlers,
    ...UserQueryHandlers,
  ],
})
export class UserModule {}
