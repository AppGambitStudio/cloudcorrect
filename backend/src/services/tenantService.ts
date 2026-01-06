import { Tenant, User, AWSAccount } from '../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = (process.env.JWT_SECRET || 'fallback-for-type-safety') as string;

if (!process.env.JWT_SECRET) {
    console.warn('WARNING: JWT_SECRET is not defined in environment variables.');
}

export const createTenantForUser = async (email: string, password: string, tenantName: string) => {
    const hashedPassword = await bcrypt.hash(password, 10);

    const tenant = await Tenant.create({
        name: tenantName,
    });

    const user = await User.create({
        email,
        password: hashedPassword,
        tenantId: tenant.id,
    });

    const token = jwt.sign(
        { userId: user.id, tenantId: tenant.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '8h' }
    );

    return { token, user: { id: user.id, email: user.email, tenantId: tenant.id } };
};

export const authenticateUser = async (email: string, password: string) => {
    const user = await User.findOne({ where: { email } });
    if (!user) {
        throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        throw new Error('Invalid password');
    }

    const token = jwt.sign(
        { userId: user.id, tenantId: user.tenantId, email: user.email },
        JWT_SECRET,
        { expiresIn: '8h' }
    );

    return { token, user: { id: user.id, email: user.email, tenantId: user.tenantId } };
};

export const getTenantDetails = async (tenantId: string) => {
    const tenant = await Tenant.findByPk(tenantId, {
        include: [AWSAccount],
    });
    return tenant;
};
