import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { generateToken } from '@/lib/auth';

const registerSchema = z.object({
  username: z.string().min(3, 'Nome de usuário deve ter pelo menos 3 caracteres'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { username, password } = validationResult.data;

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Nome de usuário já existe' },
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const user = await db.user.create({
      data: {
        username,
        password_hash,
      },
      select: {
        id: true,
        username: true,
        created_at: true,
      },
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      token,
      user,
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}