import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { db } from "../db_parrucchieri";

interface GoogleUser {
  id: number;
<<<<<<< HEAD
<<<<<<< HEAD
  nome: string;
  cognome: string;
=======
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
=======
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
  email: string;
  ruolo: string;
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl =
  process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback";

<<<<<<< HEAD
<<<<<<< HEAD
=======
// Controllo variabili ambiente
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
=======
// Controllo variabili ambiente
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
if (!googleClientId || !googleClientSecret) {
  throw new Error("GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET mancanti nel file .env");
}

<<<<<<< HEAD
<<<<<<< HEAD
function extractGoogleNames(profile: Profile) {
  const rawNome =
    profile.name?.givenName ||
    (profile as any)._json?.given_name ||
    "";

  const rawCognome =
    profile.name?.familyName ||
    (profile as any)._json?.family_name ||
    "";

  const displayName = (profile.displayName || "").trim();
  const parts = displayName.split(" ").filter(Boolean);

  if (parts.length >= 2) {
    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];

    // Caso standard: NOME COGNOME
    if (
      rawNome &&
      rawCognome &&
      rawNome.toLowerCase() === firstPart.toLowerCase() &&
      rawCognome.toLowerCase() === lastPart.toLowerCase()
    ) {
      return {
        nome: rawNome,
        cognome: rawCognome
      };
    }

    // Caso invertito: COGNOME NOME
    if (
      rawNome &&
      rawCognome &&
      rawNome.toLowerCase() === lastPart.toLowerCase() &&
      rawCognome.toLowerCase() === firstPart.toLowerCase()
    ) {
      return {
        nome: lastPart,
        cognome: firstPart
      };
    }

    // Fallback: se non è chiaro, uso i campi Google raw se presenti
    return {
      nome: rawNome || firstPart,
      cognome: rawCognome || lastPart
    };
  }

  return {
    nome: rawNome,
    cognome: rawCognome
  };
}

=======
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
=======
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
passport.use(
  new GoogleStrategy(
    {
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: googleCallbackUrl
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: (error: any, user?: any) => void
    ) => {
      try {
<<<<<<< HEAD
<<<<<<< HEAD
        const email = profile.emails?.[0]?.value || "";
        const googleId = profile.id || "";
        const fotoProfilo = profile.photos?.[0]?.value || "";

        const { nome, cognome } = extractGoogleNames(profile);

        console.log("GOOGLE RAW PROFILE:", {
          id: profile.id,
          displayName: profile.displayName,
          givenName: profile.name?.givenName,
          familyName: profile.name?.familyName,
          jsonGivenName: (profile as any)._json?.given_name,
          jsonFamilyName: (profile as any)._json?.family_name,
          email,
          googleId,
          photo: fotoProfilo
        });

        console.log("DATI FINALI USATI:", {
          nome,
          cognome,
          email
        });
=======
        const email = profile.emails?.[0]?.value;
        const nome = profile.name?.givenName || "";
        const cognome = profile.name?.familyName || "";
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
=======
        const email = profile.emails?.[0]?.value;
        const nome = profile.name?.givenName || "";
        const cognome = profile.name?.familyName || "";
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b

        if (!email) {
          return done(new Error("Email Google non disponibile"));
        }

        const [rows]: any = await db.query(
<<<<<<< HEAD
<<<<<<< HEAD
          `SELECT idUtente, nome, cognome, email, ruolo
           FROM utenti
           WHERE email = ?
           LIMIT 1`,
          [email]
        );

        const user = rows[0];

        if (!user) {
          const [result]: any = await db.query(
            `INSERT INTO utenti (nome, cognome, email, password, ruolo)
             VALUES (?, ?, ?, ?, ?)`,
=======
=======
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
          "SELECT idUtente, email, ruolo, password FROM utenti WHERE email = ? LIMIT 1",
          [email]
        );

        let user = rows[0];

        // Se l'utente non esiste, lo creo come utente Google
        if (!user) {
          const [result]: any = await db.query(
            "INSERT INTO utenti (nome, cognome, email, password, ruolo) VALUES (?, ?, ?, ?, ?)",
<<<<<<< HEAD
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
=======
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
            [nome, cognome, email, "", "cliente"]
          );

          const newUser: GoogleUser = {
            id: result.insertId,
<<<<<<< HEAD
<<<<<<< HEAD
            nome,
            cognome,
=======
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
=======
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
            email,
            ruolo: "cliente"
          };

          return done(null, newUser);
        }

<<<<<<< HEAD
<<<<<<< HEAD
        await db.query(
          `UPDATE utenti
           SET nome = ?, cognome = ?
           WHERE idUtente = ?`,
          [nome, cognome, user.idUtente]
        );

        const existingUser: GoogleUser = {
          id: user.idUtente,
          nome,
          cognome,
=======
        // Se l'utente esiste già
        const existingUser: GoogleUser = {
          id: user.idUtente,
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
=======
        // Se l'utente esiste già
        const existingUser: GoogleUser = {
          id: user.idUtente,
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
          email: user.email,
          ruolo: user.ruolo
        };

        return done(null, existingUser);
      } catch (error) {
        console.error("Errore autenticazione Google:", error);
        return done(error);
      }
    }
  )
);

<<<<<<< HEAD
<<<<<<< HEAD
=======
// Necessari se usi sessioni con passport
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
=======
// Necessari se usi sessioni con passport
>>>>>>> e6353e48f1bb52feb6a3fc2ca92746bc7c46862b
passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;