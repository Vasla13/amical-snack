import { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../../../config/firebase.js";
import { UHA_KV_RQ, ADMIN_EMAIL, APP_URL } from "../../../config/constants.js";

export function useLogin() {
  const [mode, setMode] = useState("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const clean = () => {
    setError("");
    setSuccessMsg("");
    setLoading(false);
  };

  const handleSendLink = async (e) => {
    e?.preventDefault();
    clean();
    const mail = email.trim();

    if (!UHA_KV_RQ.test(mail) && mail !== ADMIN_EMAIL) {
      return setError("Veuillez utiliser une adresse universitaire (@uha.fr).");
    }

    try {
      setLoading(true);
      const actionCodeSettings = {
        url: `${APP_URL}/login`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, mail, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", mail);
      setEmailSent(true);
    } catch (err) {
      console.error(err);
      if (err?.code === "auth/quota-exceeded") {
        setError(
          "Limite d'envoi atteinte. Veuillez réessayer demain ou contacter un administrateur."
        );
      } else {
        setError(
          "Impossible d'envoyer le lien. Veuillez vérifier votre adresse email."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    clean();
    if (!email || !password)
      return setError("Veuillez remplir tous les champs.");

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Identifiants incorrects.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    const mail = email.trim();
    if (!mail) return setError("Veuillez saisir votre email ci-dessus.");

    try {
      setLoading(true);
      const actionCodeSettings = {
        url: `${APP_URL}/auth/action`,
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, mail, actionCodeSettings);
      setSuccessMsg(
        "Lien de réinitialisation envoyé. Vérifiez vos courriers indésirables."
      );
      setError("");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("Aucun compte associé à cette adresse email.");
      } else {
        setError("Erreur : " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
    successMsg,
    emailSent,
    setEmailSent,
    handleSendLink,
    handleLogin,
    handleForgot,
  };
}
