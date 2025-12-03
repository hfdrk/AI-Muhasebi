import { prisma } from "../lib/prisma";
import { NotFoundError } from "@repo/shared-utils";
import type { User } from "@repo/core-domain";

export class UserService {
  async getCurrentUserWithTenants(userId: string): Promise<{
    user: User;
    tenants: Array<{
      id: string;
      name: string;
      slug: string;
      role: string;
      status: string;
    }>;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("Kullanıcı bulunamadı.");
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        hashedPassword: user.hashedPassword,
        fullName: user.fullName,
        locale: user.locale,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tenants: user.memberships.map((m) => ({
        id: m.tenant.id,
        name: m.tenant.name,
        slug: m.tenant.slug,
        role: m.role,
        status: m.status,
      })),
    };
  }
}

export const userService = new UserService();

