import { createContext } from 'react'

/**
 * Kept in its own module so that AuthProvider.jsx only ever exports a
 * component — otherwise Fast Refresh loses its state on every edit.
 */
export const AuthContext = createContext(null)
