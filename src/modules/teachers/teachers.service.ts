import { Teachers } from './teachers.model';
import { Students } from '../students/students.model';
import { Groups } from '../groups/groups.model';
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

const NO_PERMISSION_MSG = 'You do not have permission for this';


class TeachersService {

  public async createOne(teacherData: ITeachersData, user: CustomUser): Promise<Teachers> {

    // superAdmin validation
    if (!user.isAdmin) {
      throw new Unauthorized(NO_PERMISSION_MSG);
    }

    // duplicate validation
    if (await this.findOneByEmail(teacherData.email)) {
      throw new BadRequest('User with provided email already exists');
    }

    const { password } = teacherData;

    teacherData.password = hashFunc(password);
    teacherData.isAdmin = false;
    
    const result: Teachers = await Teachers.create(teacherData); // what should i return ?

    delete result.password

    return result
  }

  public async deleteOneById(id: number, user: CustomUser): Promise<number> {

    // superAdmin validation
    if (!user.isAdmin) {
      throw new Unauthorized(NO_PERMISSION_MSG);
    }

    return sequelize.transaction(async (transaction) => {
      const teacher = await Teachers.findOne({ where: { id }, transaction });
      if (!teacher) {
        throw new NotFound(`Can't find the teacher with id ${id}`);
      }

      await Teachers.destroy({ where: { id }, transaction });
      return id;
    });
  }

  public async findAll(supposedPage: number = 1, limit: number = 10) : Promise<IPaginationOuterData<Teachers>>{

    const total: number = await Teachers.count(); // actual teachers count in db
    const {offset, actualPage} = await paginationService.getOffset(supposedPage, limit, total);
    const data: Teachers[] = await Teachers.findAll({offset, limit});

    // take necessary groups info out from db
    const groupsData: Groups[] = await Groups.findAll({
      attributes: ['id', 'teacherId'],
    });

    // take necessary students info out from db
    const studentsData: Students[] = await Students.findAll({
      attributes: ['id', 'groupId'],
    }); 

    // add in the data groupsCount field with the value
    data.forEach(item => {
      let groupsSet: Set<number> = new Set([]); // Set collection of unique group IDs

      // fulfill Set collection of unique group IDs
      groupsData.forEach(el => {
        if (item.id === el.teacherId) {
          groupsSet.add(el.id);
        }
      });

      const groupsCount: number = groupsSet.size; // groups count

      let studentsCount: number = 0; // define students counter

      // iterate students counter if the id of group === student.groupId
      groupsSet.forEach(groupId => {
        studentsData.forEach(student => {
          if (groupId === student.groupId) {
            studentsCount++;
          }
        });
      });

      // give a teacher object props for goups and students quantity
      item.studentsCount = studentsCount;
      item.groupsCount = groupsCount;
    });

    return { data, actualPage, total, limit };
  }

  public async findOneByEmail(email: string) {
    return await Teachers.findOne({
        where: { email },
        include: [{
            model: Avatars, as: 'avatar', attributes: ['avatarLink'],
        }],
    }); 
  }

  public async findOneById(id: number, transaction?: Transaction) {
    const teacher = await Teachers.findOne({
      where: { id },
      include: [{
          model: Avatars, as: 'avatar', attributes: ['avatarLink'],
      }],
      transaction,
    });

    return teacher;
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
            const { avatar } = data;
            if (avatar) {
                const {img, format} = avatar;
                await avatarService.setAvatarToUserOrThrow(img, format, teacher, transaction);
            }
            await Teachers.update(data, { where: { id }, transaction });
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
