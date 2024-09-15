export const passwordValidation = (password: string): boolean => {
  const minLength = password.length >= 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);

  return minLength && hasUpperCase && hasLowerCase;
};
