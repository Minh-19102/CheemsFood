import {
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddUserDto } from './dto/addMember.dto';
import prisma from '../lib/prisma';

@Injectable()
export class GroupService {
  constructor() {}
  async create(createGroupDto: CreateGroupDto) {
    const { userId, groupName } = createGroupDto;
    const group = await prisma.gGroup.create({
      data: {
        name: groupName,
        users: {
          create: {
            userId: userId,
            isGroupAdmin: true
          }
        }
      }
    });
    return group;
  }

  async findAllGroupOfAnUser(userId: number) {
    const groups = await prisma.groupMember.findMany({
      where: {
        userId: userId
      },
      include: {
        group: true
      }
    });
    groups.map((e) => {
      e['name'] = e.group.name;
      delete e.group;
      return e;
    });
    return groups;
  }

  async teamDetail(groupId: number) {
    const group = await prisma.gGroup.findUnique({
      where: { groupId },
      include: {
        users: {
          select: {
            userId: true,
            isGroupAdmin: true,
            user: { select: { username: true, name: true } }
          }
        }
      }
    });
    group.users.map((user) => {
      user['username'] = user.user.username;
      user['name'] = user.user.name;
      delete user.user;
      return user;
    });
    return group;
  }

  async addUser(id: number, addUserDto: AddUserDto) {
    const { userId } = addUserDto;
    try {
      const group = await prisma.gGroup.findUnique({
        where: { groupId: id }
      });
      if (!group) {
        throw new NotFoundException('Không tìm thấy nhóm');
      }

      const user = await prisma.user.findUnique({ where: { userId } });
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }

      const groupMember = await prisma.groupMember.create({
        data: {
          groupId: id,
          userId: userId,
          isGroupAdmin: false
        }
      });

      return { message: 'Thêm người dùng vào nhóm thành công' };
    } catch (error) {
      if (error.code == 'P2002') {
        return {
          statusCode: 400,
          message: 'Người dùng đã có trong nhóm'
        };
      }
      throw new InternalServerErrorException('Failed to add user to group');
    }
  }

  async removeUser(id: number, removeUserDto: AddUserDto) {
    const { userId } = removeUserDto;
    try {
      const group = await prisma.gGroup.findUnique({
        where: { groupId: id }
      });
      if (!group) {
        throw new NotFoundException('Không tìm thấy nhóm');
      }

      const user = await prisma.user.findUnique({ where: { userId } });
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }

      await prisma.groupMember.delete({
        where: {
          groupId_userId: {
            groupId: id,
            userId: userId
          }
        }
      });

      return { message: 'Xóa người dùng khỏi nhóm thành công' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to remove user from group'
      );
    }
  }

  async update(id: number, updateGroupDto: UpdateGroupDto) {
    const { name } = updateGroupDto;
    try {
      const group = await prisma.gGroup.findUnique({
        where: {
          groupId: id
        }
      });
      if (!group) throw new NotFoundException('Group not found');
      else
        await prisma.gGroup.update({
          data: {
            name: name
          },
          where: {
            groupId: group.groupId
          }
        });
    } catch (error) {
      throw new InternalServerErrorException('Failed to update');
    }
    return 'Updated successfully';
  }

  remove(id: number) {
    return `This action removes a #${id} group`;
  }
}
