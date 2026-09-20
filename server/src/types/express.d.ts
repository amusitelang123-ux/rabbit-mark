declare global {
  namespace Express {
    interface Request {
      auth?: {
        uid: number
        role: 'client' | 'admin'
      }
    }
  }
}

export {}
