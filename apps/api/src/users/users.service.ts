import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  create(data: Pick<User, 'name' | 'email' | 'passwordHash' | 'role'> & { phone?: string }) {
    return this.users.create(data);
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.users.findOne({ email: email.toLowerCase() }).exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.users.findById(id).exec();
  }

  async setRefreshTokenHash(id: string, hash: string | null) {
    await this.users.updateOne(
      { _id: id },
      hash ? { refreshTokenHash: hash } : { $unset: { refreshTokenHash: 1 } },
    );
  }
}
