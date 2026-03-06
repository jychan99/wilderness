import * as bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

export const isPasswordHashed = (storedPassword: string): boolean => {
  if (!storedPassword) return false;
  return (
    storedPassword.startsWith("$2a$") ||
    storedPassword.startsWith("$2b$") ||
    storedPassword.startsWith("$2y$")
  );
};

export const isBcryptHash = (storedPassword: string): boolean => {
  if (!storedPassword) return false;
  return (
    storedPassword.startsWith("$2a$") ||
    storedPassword.startsWith("$2b$") ||
    storedPassword.startsWith("$2y$")
  );
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(BCRYPT_COST);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (
  plainPassword: string,
  storedPassword: string,
): Promise<boolean> => {
  if (!isBcryptHash(storedPassword)) return false;
  return bcrypt.compare(plainPassword, storedPassword);
};
