import { Students } from './students.model';
import { groupsService } from '../groups/groups.service';
import { teachersService } from '../teachers/teachers.service';
import { avatarService } from '../avatars/avatars.service';
import { BadRequest, NotFound, Unauthorized, Forbidden } from '../../common/exeptions';
import { hashFunc } from '../auth/password.hash';
import * as bcrypt from 'bcrypt';
import { Avatars } from '../avatars/avatars.model';
import { sequelize } from '../../database';
import { Transaction } from 'sequelize';
import { TokenService } from "../../common/crypto/TokenService";
import { IUpdatePassword } from "../../common/interfaces/auth.interfaces";
import { CustomUser } from '../../common/types/types';
import { Teachers } from "../teachers/teachers.model";

const NO_RIGHTS = 'You do not have rights to do this.';

interface IStudentsData {
    email: string;
    password: string;
    passwordConfirmation: string;
    firstNameUkr: string;
    lastNameUkr: string;
    phoneNumber: number;
    groupToken: string;
    firstNameEng: string;
    lastNameEng: string;
    groupId: number;
    avatar?: {
        img: string;
        format: string;
    };
}

class StudentsService {
  public async createOne(studentsData: IStudentsData): Promise<Students> {
    const { email, groupToken } = studentsData;

        if (await teachersService.findOneByEmail(email)) {
            throw new BadRequest('User with provided email already exists');
        }

        if (await this.findOneByEmail(email)) {
            throw new BadRequest('User with provided email already exists');
        }

        const group = await groupsService.findByTokenOrThrow(groupToken);

        if (!group) {
            throw new NotFound('Group not found');
        }

        studentsData.groupId = group.id;

        const students = new Students(studentsData);
        students.password = hashFunc(students.password);

        return students.save();
    }

    public async findOneByEmail(email: string): Promise<Students> {
        const student = await Students.findOne({
            where: {email},
            include: [{
                model: Avatars, as: 'avatar', attributes: ['avatarLink'],
            }],
        });

        return student;
    }

    public async findOneById(id: number, transaction?: Transaction): Promise<Students> {
        const student = await Students.findOne({
            where: {id},
            include: [{
                model: Avatars, as: 'avatar', attributes: ['avatarLink'],
            }],
            attributes: {exclude: ['password']},
            transaction,
        });

        return student;
    }

    public async findOneByIdOrThrow(id: number, transaction?: Transaction): Promise<Students> {
        const student = this.findOneById(id);
        if (!student) {
            throw new BadRequest(`User with id ${id} not found`);
        }
        return student;
    }

    public async updateOneOrThrow(id: number, data: Partial<IStudentsData>, user: Students): Promise<Students> {
        return sequelize.transaction(async (transaction) => {

            if (data.email && user.email !== data.email) {
                if (await this.findOneByEmail(data.email) ||
                    await teachersService.findOneByEmail(data.email)) {
                        throw new BadRequest('User with provided email already exists');
                }
            }
            if (id !== user.id) {
                throw new Unauthorized('You cannot change another profile');
            }
            const student = await this.findOneByIdOrThrow(id, transaction);
            const {avatar} = data;
            if (avatar) {
                const {img, format} = avatar;
                await avatarService.setAvatarToUserOrThrow(img, format, student, transaction);
            }
            Object.keys(data).forEach((k) => student[k] = data[k]);
            await student.save({transaction});
            return this.findOneByIdOrThrow(id, transaction);
        });
    }

    public async setForgotPasswordToken(email: string): Promise<string> {
        //Generate and hash password token
        const student = await this.findOneByEmail(email);
        if(!student){
            throw new NotFound(`User with email ${email} does not exist`);
        }
        const token: string = new TokenService().generateResetToken();
        student.resetPasswordExpire = Date.now() + (60 * 1000 * 360);
        student.resetPasswordToken = token;
        await student.save();
        return token;
    }

    public async updatePassword({oldPassword, newPassword}: IUpdatePassword,
                                {email, password}: Students): Promise<Students> {
        const userForUpdate: Students = await this.findOneByEmail(email);

        if (!bcrypt.compareSync(oldPassword, password)) {
            throw new Unauthorized('Wrong password');
        }

        userForUpdate.password = hashFunc(newPassword);
        userForUpdate.resetPasswordExpire = Date.now();
        userForUpdate.resetPasswordToken = null;

        return userForUpdate.save();
    }

    // method that front needs to get students by teachers IDs
    public async findAllByGroupsIdsArray(groupsIds: number[]): Promise<Students[]> {
      return await Students.findAll({
        where: {
          groupId: groupsIds,
        },
        attributes: ['id', 'groupId'],
      });
    }

    public async findStudentByToken(token: string): Promise<Students> {
        return Students.findOne({
            where: {resetPasswordToken: token},
        });
    }

    public async resetPassword(password: string, token: string): Promise<void> {
        const user: Students = await this.findStudentByToken(token);
        if (!user) {
            throw new NotFound('User for your token does not exist')
        }
        user.password = hashFunc(password);
        user.resetPasswordToken = null;
        user.resetPasswordExpire = Date.now();

        await user.save();
    }

    public async deleteStudent(id: number, user: CustomUser): Promise<void> {

        if (!user.isMentor) {
            throw new Forbidden(NO_RIGHTS);
        }
        return sequelize.transaction(async (transaction: Transaction) => {

        const student = await this.findOneById(id, transaction);
        if(!student){
            throw new BadRequest(`User with ${id} is not found`)
        }
            return student.destroy({transaction});
        })
    }

    public async findAllByGroupId(groupId: number, transaction?: Transaction): Promise<Students[]> {
        return Students.findAll({where: {groupId}, transaction});
    }
}

export const studentsService = new StudentsService();
