// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'

// Extend Vitest's expect with @testing-library/jest-dom DOM matchers
// (e.g. toBeInTheDocument, toBeDisabled, toHaveTextContent, …)
import '@testing-library/jest-dom'

// Automatically clean up React renders after each test so DOM nodes
// do not leak between test cases.
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
