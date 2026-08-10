import auth from "@react-native-firebase/auth";
import { clearAsyncStorageBackup } from "./editData";

export default async function signout() {
  try {
    await clearAsyncStorageBackup();
    await auth().signOut();
    console.log("User signed out successfully");
  } catch (e) {
    console.error(e);
  }
}
