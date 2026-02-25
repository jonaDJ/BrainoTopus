import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders landing page with nav and game cards', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /be dumb\. be octopus\./i }),
    ).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Games' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contact' })).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /wordle/i })).toBeVisible()
    expect(screen.getAllByText(/developing/i)).toHaveLength(1)
  })
})
