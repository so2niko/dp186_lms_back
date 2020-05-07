import { Teachers } from './teachers.model';
import { NotFound, Unauthorized } from '../../common/exeptions/';
import { Avatars } from '../avatars/avatars.model';
import { Transaction } from 'sequelize';
import { avatarService } from '../avatars/avatars.service';
import { hashFunc } from '../auth/password.hash';
import * as bcrypt from 'bcrypt';
import { IUpdatePassword } from '../../common/interfaces/auth.interfaces';
import { sequelize } from '../../database';
import { TokenService } from "../../common/crypto/TokenService";


interface ITeachersData {
    firstName?: string;
    lastName?: string;
    email?: string;
    isAdmin?: boolean;
    avatar?: {
        img: string;
        format: string;
    };
}

class TeachersService {
    public async findOneByEmail(email: string) {
        const teacher = await Teachers.findOne({
            where: {email},
            include: [{
                model: Avatars, as: 'avatar', attributes: ['avatarLink'],
            }],
        });

        return teacher;
    }

    public findTeacherByToken(token:string):Promise<Teachers>{
        return Teachers.findOne({
            where: {resetPasswordToken: token},
        });
    }
    public async resetPassword(password:string, token: string): Promise<void> {
        const user = await this.findTeacherByToken(token);
        if(!user){
            throw new NotFound('User for your token does not exist')
        }
        user.password = hashFunc(password);
        user.resetPasswordToken = null;
        user.resetPasswordExpire = Date.now();

        await user.save();
    }

    public async findOneById(id: number, transaction?: Transaction) {
        return Teachers.findOne({
            where: {id},
            include: [{
                model: Avatars, as: 'avatar', attributes: ['avatarLink'],
            }],
            transaction,
        });
    }

    public async setForgotPasswordToken(email: string): Promise<string> {
        const teacher = await this.findOneByEmail(email);
        const token: string = new TokenService().generateResetToken();
        teacher.resetPasswordExpire = Date.now() + (60 * 1000 * 360);
        teacher.resetPasswordToken = token;
        await teacher.save();
        return token;
    }

    public async findOneByIdOrThrow(id: number, transaction?: Transaction): Promise<Teachers> {
        const teacher = await Teachers.findOne({
            where: {id},
            include: [{
                model: Avatars, as: 'avatar', attributes: ['avatarLink'],
            }],
            attributes: {exclude: ['password']},
            transaction,
        });
        if (!teacher) {
            throw new NotFound(`Teacher with ${id} not found`);
        }
        return teacher;
    }

    public async updateOneOrThrow(id: number, data: ITeachersData, user: Teachers) {
        return sequelize.transaction(async (transaction: Transaction) => {
            if (id !== user.id && !user.isAdmin) {
                throw new Unauthorized('You cannot change another profile');
            }
            const teacher: Teachers = await this.findOneByIdOrThrow(id, transaction);
            if (user.isAdmin && !teacher) {
                throw new NotFound(`There is no teacher with id ${id}`);
            }
            const {avatar} = data;
            if (avatar) {
                const {img, format} = avatar;
                await avatarService.setAvatarToUserOrThrow(img, format, teacher, transaction);
            }
            await Teachers.update(data, {where: {id}, transaction});
            return this.findOneByIdOrThrow(id, transaction);
        });
    }

    public async updatePassword({oldPassword, newPassword}: IUpdatePassword,
                                user: Teachers) {
        const userForUpdate: Teachers = await this.findOneById(user.id);

        if (!bcrypt.compareSync(oldPassword, user.password)) {
            throw new Unauthorized('Wrong password');
        }

        userForUpdate.password = hashFunc(newPassword);

        return userForUpdate.save();
    }

    public async updatePasswordBySuperAdmin(id: number,
                                            {newPassword}: IUpdatePassword, user: Teachers) {
        if (!user.isAdmin) {
            throw new Unauthorized('You cannot change password for another teacher');
        }

        const userForUpdate: Teachers = await this.findOneById(id);

        userForUpdate.password = hashFunc(newPassword);

        return userForUpdate.save();
    }
}

export const teachersService = new TeachersService();
