import { createContext } from 'react'

/**
 * Kept in its own module so that ProfileProvider.jsx only ever exports a
 * component — same reason as auth-context.js.
 */
export const ProfileContext = createContext(null)
