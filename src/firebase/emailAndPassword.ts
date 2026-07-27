import auth from '@react-native-firebase/auth';

export async function sendPasswordResetEmailToUser(email: string): Promise<void> {
  await auth().sendPasswordResetEmail(email);
}

export async function createUserEmailPass(email: string, password: string) {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    return userCredential.user;
  } catch (error: unknown) {
    const errorCode = (error as { code: string }).code;
    const errorMessage = (error as { message: string }).message;
    console.error('Error creating user:', { errorCode, errorMessage });
    throw error;
  }
}

export async function loginWithEmailAndPassword(email: string, password: string) {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    return userCredential.user;
  } catch (error: unknown) {
    const errorCode = (error as { code: string }).code;
    const errorMessage = (error as { message: string }).message;
    // expected for new users — the caller falls back to signup, don't spam console.error
    throw error;
  }
}