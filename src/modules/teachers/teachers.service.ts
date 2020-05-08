import { Teachers } from './teachers.model';
import { BadRequest } from '../../common/exeptions';
import { CustomUser } from '../../common/types/types';
import { NotFound, Unauthorized } from '../../common/exeptions/';
import { Avatars } from '../avatars/avatars.model';
import { avatarService } from '../avatars/avatars.service';
import { IUpdatePassword } from '../../common/interfaces/auth.interfaces';
import { sequelize } from '../../database';
import { hashFunc } from '../auth/password.hash';
import * as bcrypt from 'bcrypt';
import { Transaction } from 'sequelize/types';
import { paginationService } from '../pagination/pagination.service';
import { ITeachersData } from '../../common/interfaces/teachers.interfaces';
import { IPaginationOuterData } from '../../common/interfaces/pagination.interfaces';
import { TokenService } from "../../common/crypto/TokenService";
import { studentsService } from '../students/students.service';


const NO_PERMISSION_MSG = 'You do not have permission for this';


class TeachersService {

    public async createOne(teacherData: ITeachersData, user: CustomUser): Promise<Teachers> {

        return sequelize.transaction(async (transaction) => {
            // superAdmin validation
            if (!user.isAdmin) {
                throw new Unauthorized(NO_PERMISSION_MSG);
            }

            // duplicate validation
            if (await this.findOneByEmail(teacherData.email, transaction)) {
                throw new BadRequest('User with provided email already exists');
            }

            const result: Teachers = await Teachers.create(teacherData, {transaction: transaction});

            delete result.password;

            return result
        });

    }

    public async deleteOneById(id: number, user: CustomUser): Promise<number> {

        // superAdmin validation
        if (!user.isAdmin) {
            throw new Unauthorized(NO_PERMISSION_MSG);
        }

        return sequelize.transaction(async (transaction) => {
            const teacher = await Teachers.findOne({where: {id}, transaction});
            if (!teacher) {
                throw new NotFound(`Can't find the teacher with id ${id}`);
            }

            await Teachers.destroy({where: {id}, transaction});
            return id;
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

    public findTeacherByToken(token: string): Promise<Teachers> {
        return Teachers.findOne({
            where: {resetPasswordToken: token},
        });
    }

    public async resetPassword(password: string, token: string): Promise<void> {
        const user = await this.findTeacherByToken(token);
        if (!user) {
            throw new NotFound('User for your token does not exist')
        }
        user.password = hashFunc(password);
        user.resetPasswordToken = null;
        user.resetPasswordExpire = Date.now();

        await user.save();
    }


    public async findAll(page: number = 1, limit: number = 10): Promise<IPaginationOuterData<Teachers>> {
        const total: number = await Teachers.count(); // actual teachers count in db
        const {offset, actualPage} = await paginationService.getOffset(page, limit, total);
        page = actualPage;
        const data: Teachers[] = await Teachers.findAll({offset, limit});

        return {data, page, total, limit};
    }

    public async findOneByEmail(email: string, transaction?: Transaction) {
        return Teachers.findOne({
            where: {email},
            include: [{
                model: Avatars, as: 'avatar', attributes: ['avatarLink'],
            }],
            transaction,
        });
    }

    public async findOneById(id: number, transaction?: Transaction) {
        return Teachers.findOne({
            where: {id},
            include: [{
                model: Avatars, as: 'avatar', attributes: ['avatarLink'],
            }],
            attributes: {exclude: ['password']},
            transaction,
        });
    }

    public async findOneByIdOrThrow(id: number, transaction?: Transaction): Promise<Teachers> {
        const teacher = await this.findOneById(id, transaction);
        if (!teacher) {
            throw new NotFound(`Teacher with ${id} not found`);
        }
        return teacher;
    }

    public async updateOneOrThrow(id: number, data: ITeachersData, user: Teachers):
        Promise<Teachers> {
        return sequelize.transaction(async (transaction: Transaction) => {

            if (data.email && await this.findOneByEmail(data.email)) {
                throw new BadRequest('User with provided email already exists');
            }

                throw new BadRequest('User with provided email already exists');
            }

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
                                user: Teachers): Promise<Teachers> {
        const userForUpdate: Teachers = await this.findOneById(user.id);

        if (!bcrypt.compareSync(oldPassword, user.password)) {
            throw new Unauthorized('Wrong password');
        }

        userForUpdate.password = hashFunc(newPassword);

        return userForUpdate.save();
    }

    public async updatePasswordBySuperAdmin(id: number,
                                            {newPassword}: IUpdatePassword, user: Teachers): Promise<Teachers> {
        if (!user.isAdmin) {
            throw new Unauthorized('You cannot change password for another teacher');
        }

        const userForUpdate: Teachers = await this.findOneById(id);

        userForUpdate.password = hashFunc(newPassword);

        return userForUpdate.save();
    }
}

export const teachersService = new TeachersService();
