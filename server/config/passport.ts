import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { db } from "../db_parrucchieri";

interface GoogleUser {
  id: number;
  email: string;
  ruolo: string;
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl =
  process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/auth/google/callback";

// Controllo variabili ambiente
if (!googleClientId || !googleClientSecret) {
  throw new Error("GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET mancanti nel file .env");
}

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
        const email = profile.emails?.[0]?.value;
        const nome = profile.name?.givenName || "";
        const cognome = profile.name?.familyName || "";

        if (!email) {
          return done(new Error("Email Google non disponibile"));
        }

        const [rows]: any = await db.query(
          "SELECT idUtente, email, ruolo, password FROM utenti WHERE email = ? LIMIT 1",
          [email]
        );

        let user = rows[0];

        // Se l'utente non esiste, lo creo come utente Google
        if (!user) {
          const [result]: any = await db.query(
            "INSERT INTO utenti (nome, cognome, email, password, ruolo) VALUES (?, ?, ?, ?, ?)",
            [nome, cognome, email, "", "cliente"]
          );

          const newUser: GoogleUser = {
            id: result.insertId,
            email,
            ruolo: "cliente"
          };

          return done(null, newUser);
        }

        // Se l'utente esiste già
        const existingUser: GoogleUser = {
          id: user.idUtente,
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

// Necessari se usi sessioni con passport
passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;