import { JwtPayload } from '@app/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: any) =>
          request?.cookies?.Authentication || request?.Authentication,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('JWT_ACCESS_SECRET'),
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}