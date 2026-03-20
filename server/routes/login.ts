import express, { Request, Response } from "express"
import { db } from "../db_parrucchieri"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const router = express.Router()

interface User {
    id: number
    email: string
    password: string
}

// LOGIN
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body

        const result = await db.query(
            "SELECT * FROM utenti WHERE email = ?",
            [email]
        )

        const users = result[0] as User[]
        const user = users[0]

        if (!user) {
            return res.status(400).json({ message: 'Utente non trovato' })
        }

        const validate = await bcrypt.compare(password, user.password)

        if (!validate) {
            return res.status(400).json({ message: 'Password errata' })
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET as string,
            { expiresIn: "1d" }
        )

        res.json({ token })

    } catch (err: any) {
        res.status(500).json({ error: err.message })
    }
})

export default router