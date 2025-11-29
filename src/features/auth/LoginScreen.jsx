import React, { useState } from "react";
import Button from "../../ui/Button.jsx";

export default function LoginScreen({ onLogin }) {
  const [email, setE] = useState("");

  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-24 h-24 bg-teal-700 rounded-full flex items-center justify-center text-white font-bold text-3xl mb-6 shadow-xl">
        RT
      </div>
      <h1 className="text-2xl font-black text-teal-800 mb-8 tracking-tight">
        AMICALE CONNECT
      </h1>
      <input
        className="w-full p-4 bg-gray-50 rounded-xl mb-4 border focus:border-teal-500 outline-none transition-all"
        placeholder="votre.nom@uha.fr"
        value={email}
        onChange={(e) => setE(e.target.value)}
      />
      <Button
        onClick={() => onLogin(email)}
        className="w-full text-lg shadow-teal-200"
      >
        CONNEXION
      </Button>
      <div className="mt-8 text-xs text-gray-400 text-center bg-gray-50 p-4 rounded-xl w-full">
        <p className="font-bold mb-1">COMPTES DÉMO :</p>
        <p>Admin : admin@uha.fr</p>
        <p>Étudiant : etudiant@uha.fr</p>
      </div>
    </div>
  );
}
