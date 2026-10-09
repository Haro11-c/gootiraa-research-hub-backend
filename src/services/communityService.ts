import { prisma } from '../db/prisma';

export class CommunityService {
  async getQuestions(publicationId?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (publicationId) {
      where.publicationId = publicationId;
    }

    const [total, questions] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              profile: {
                select: {
                  fullName: true,
                  academicTitle: true,
                  avatarUrl: true,
                },
              },
            },
          },
          publication: {
            select: { id: true, title: true, publicationYear: true },
          },
          answers: {
            include: {
              user: {
                select: {
                  id: true,
                  profile: {
                    select: {
                      fullName: true,
                      academicTitle: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      questions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async askQuestion(userId: string, data: { title: string; content: string; publicationId?: string }) {
    return prisma.question.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
        publicationId: data.publicationId,
      },
    });
  }

  async answerQuestion(userId: string, questionId: string, content: string) {
    return prisma.answer.create({
      data: {
        userId,
        questionId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            profile: {
              select: {
                fullName: true,
                academicTitle: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });
  }

  async toggleFollow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new Error('You cannot follow yourself.');
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      await prisma.userProfile.updateMany({
        where: { userId: followingId },
        data: { followersCount: { decrement: 1 } },
      });
      return { following: false };
    } else {
      await prisma.follow.create({
        data: { followerId, followingId },
      });
      await prisma.userProfile.updateMany({
        where: { userId: followingId },
        data: { followersCount: { increment: 1 } },
      });
      return { following: true };
    }
  }

  async sendCollaborationRequest(senderId: string, data: { receiverId: string; subject: string; message: string }) {
    if (senderId === data.receiverId) {
      throw new Error('Cannot send collaboration request to yourself.');
    }

    return prisma.collaborationRequest.create({
      data: {
        senderId,
        receiverId: data.receiverId,
        subject: data.subject,
        message: data.message,
      },
    });
  }
}

export const communityService = new CommunityService();
