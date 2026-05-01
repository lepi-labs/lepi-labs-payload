import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks

vi.mock('@payloadcms/plugin-ecommerce/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@payloadcms/plugin-ecommerce/client/react')>()
  return {
    ...actual,
    useAddresses: vi.fn()
  }
})

vi.mock('@/lib/createAddress', () => ({
  default: vi.fn()
}))

// Imports
import { AddressForm } from "@/components/forms/AddressForm";
import createAddress from "@/lib/createAddress";
import { useAddresses } from "@payloadcms/plugin-ecommerce/client/react";

const mockUseAddresses = vi.mocked(useAddresses)
const mockCreateAddress = vi.mocked(createAddress)

// Fixtures

// Tests

describe('AddressForm', () => {
    mockUseAddresses.mockReturnValue({
      updateAddress: vi.fn()
    } as unknown as ReturnType<typeof useAddresses>)

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAddresses.mockReturnValue({
      updateAddress: vi.fn()
    } as unknown as ReturnType<typeof useAddresses>)
  })

  it('submits entered data correctly', async () => {
    render(<AddressForm />)

    const firstNameInput = screen.getByRole('textbox', { name: /first name/i })
    const lastNameInput = screen.getByRole('textbox', { name: /last name/i })
    const addressInput = screen.getByRole('textbox', { name: /address line 1/i })
    const cityInput = screen.getByRole('textbox', { name: /city/i })
    const zipInput = screen.getByRole('textbox', { name: /zip code/i })
    const stateCombo = screen.getByRole('combobox', { name: /state/i })
    const countryCombo = screen.getByRole('combobox', { name: /country/i })
    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.change(firstNameInput, { target: { value: 'Ivan' } })
    fireEvent.change(lastNameInput, { target: { value: 'Robotnik' } })
    fireEvent.change(addressInput, { target: { value: '123 Green Hill Zone' } })
    fireEvent.change(cityInput, { target: { value: 'Mobotropolis' } })
    fireEvent.change(zipInput, { target: { value: '12345' } })
    fireEvent.click(countryCombo)
    const option = screen.getByRole('option', { name: /united states/i } )
    fireEvent.click(option)
    fireEvent.click(stateCombo)
    const optionn = screen.getByRole('option', { name: 'AL' } )
    fireEvent.click(optionn)
    await act(async () => {
      fireEvent.click(submitButton)
    })

    expect(mockCreateAddress).toHaveBeenCalledOnce()
    const addressArg = mockCreateAddress.mock.lastCall![0]
    expect(addressArg.firstName).toBe('Ivan')
    expect(addressArg.lastName).toBe('Robotnik')
    expect(addressArg.addressLine1).toBe('123 Green Hill Zone')
    expect(addressArg.city).toBe('Mobotropolis')
    expect(addressArg.postalCode).toBe('12345')
    expect(addressArg.state).toBe('AL')
    expect(addressArg.country).toBe('US')
  })

  it('requires state to be set', async () => {
    render(<AddressForm />)

    const firstNameInput = screen.getByRole('textbox', { name: /first name/i })
    const lastNameInput = screen.getByRole('textbox', { name: /last name/i })
    const addressInput = screen.getByRole('textbox', { name: /address line 1/i })
    const cityInput = screen.getByRole('textbox', { name: /city/i })
    const zipInput = screen.getByRole('textbox', { name: /zip code/i })
    const countryCombo = screen.getByRole('combobox', { name: /country/i })
    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.change(firstNameInput, { target: { value: 'Ivan' } })
    fireEvent.change(lastNameInput, { target: { value: 'Robotnik' } })
    fireEvent.change(addressInput, { target: { value: '123 Green Hill Zone' } })
    fireEvent.change(cityInput, { target: { value: 'Mobotropolis' } })
    fireEvent.change(zipInput, { target: { value: '12345' } })
    fireEvent.click(countryCombo)
    const option = screen.getByRole('option', { name: /united states/i } )
    fireEvent.click(option)
    await act(async () => {
      fireEvent.click(submitButton)
    })
    expect(screen.getByText(/state is required/i)).toBeInTheDocument()
  })

  it('requires country to be set', async () => {
    render(<AddressForm />)

    const firstNameInput = screen.getByRole('textbox', { name: /first name/i })
    const lastNameInput = screen.getByRole('textbox', { name: /last name/i })
    const addressInput = screen.getByRole('textbox', { name: /address line 1/i })
    const cityInput = screen.getByRole('textbox', { name: /city/i })
    const stateCombo = screen.getByRole('combobox', { name: /state/i })
    const zipInput = screen.getByRole('textbox', { name: /zip code/i })
    const submitButton = screen.getByRole('button', { name: /submit/i })
    fireEvent.change(firstNameInput, { target: { value: 'Ivan' } })
    fireEvent.change(lastNameInput, { target: { value: 'Robotnik' } })
    fireEvent.change(addressInput, { target: { value: '123 Green Hill Zone' } })
    fireEvent.change(cityInput, { target: { value: 'Mobotropolis' } })
    fireEvent.change(zipInput, { target: { value: '12345' } })
    fireEvent.click(stateCombo)
    const option = screen.getByRole('option', { name: 'AL' } )
    fireEvent.click(option)
    await act(async () => {
      fireEvent.click(submitButton)
    })
    expect(screen.getByText(/country is required/i)).toBeInTheDocument()
  })
})