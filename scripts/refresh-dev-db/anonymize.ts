import { faker } from '@faker-js/faker'
import type { ObjectId } from 'mongodb'
import type { AnonymizeContext, RefreshStats } from './types.js'

function hashToSeed(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash)
}

function seedFromId(id: ObjectId | string): number {
  return hashToSeed(id.toString())
}

interface FakePerson {
  firstName: string
  lastName: string
  email: string
}

function fakePerson(seed: number): FakePerson {
  faker.seed(seed)
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const email = `dev-${firstName.toLowerCase()}.${lastName.toLowerCase()}-${seed.toString(36)}@example.com`
  return { firstName, lastName, email }
}

function fakePhone(seed: number): string {
  faker.seed(seed)
  return faker.phone.number()
}

function fakeCompany(seed: number): string {
  faker.seed(seed)
  return faker.company.name()
}

interface FakeAddress {
  addressLine1: string
  addressLine2: string | null
  city: string
  postalCode: string
}

function fakeAddress(seed: number): FakeAddress {
  faker.seed(seed)
  return {
    addressLine1: faker.location.streetAddress(),
    addressLine2: faker.datatype.boolean() ? faker.location.secondaryAddress() : null,
    city: faker.location.city(),
    postalCode: faker.location.zipCode(),
  }
}

export async function anonymizeAll(ctx: AnonymizeContext): Promise<void> {
  console.log('\n[3] Anonymizing PII ...')
  await anonymizeUsers(ctx)
  await anonymizeAddresses(ctx)
  await anonymizeOrders(ctx)
  await anonymizeTransactions(ctx)
  await anonymizeFormSubmissions(ctx)
  await anonymizeForms(ctx)
  await anonymizeCarts(ctx)
  await dropStaleCollections(ctx)
}

async function anonymizeUsers(ctx: AnonymizeContext): Promise<void> {
  const { db, stats, verbose } = ctx

  const admins = await db.collection('users').find({ roles: 'admin' }).toArray()
  stats.anonymize.usersPreserved = admins.length
  if (verbose) {
    for (const admin of admins) {
      console.log(`    [preserve] admin ${admin._id} (${admin.email})`)
    }
  }

  const customers = await db
    .collection('users')
    .find({ roles: { $nin: ['admin'] } })
    .toArray()

  if (customers.length === 0) {
    console.log('    No customer users to anonymize.')
    return
  }

  const bulkOps = customers.map((user) => {
    const seed = seedFromId(user._id)
    const person = fakePerson(seed)

    ctx.emailMap.set(user._id.toString(), person.email)

    return {
      updateOne: {
        filter: { _id: user._id },
        update: {
          $set: {
            email: person.email,
            name: `${person.firstName} ${person.lastName}`,
            skipSync: true,
            loginAttempts: 0,
          },
          $unset: {
            hash: '',
            salt: '',
            resetPasswordToken: '',
            resetPasswordExpiration: '',
            sessions: '',
            lockUntil: '',
            stripeID: '',
          },
        },
      },
    }
  })

  await db.collection('users').bulkWrite(bulkOps)
  stats.anonymize.usersAnonymized = customers.length
  console.log(`    Anonymized ${customers.length} customer users, preserved ${admins.length} admin users.`)
}

async function anonymizeAddresses(ctx: AnonymizeContext): Promise<void> {
  const { db, stats, verbose } = ctx

  const addresses = await db.collection('addresses').find({}).toArray()
  if (addresses.length === 0) {
    console.log('    No addresses to anonymize.')
    return
  }

  const bulkOps = addresses.map((addr) => {
    const seed = seedFromId(addr._id)
    const person = fakePerson(seed)
    const address = fakeAddress(seed + 1)
    const phone = fakePhone(seed + 2)
    const company = fakeCompany(seed + 3)

    return {
      updateOne: {
        filter: { _id: addr._id },
        update: {
          $set: {
            firstName: person.firstName,
            lastName: person.lastName,
            company,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            city: address.city,
            postalCode: address.postalCode,
            phone,
          },
        },
      },
    }
  })

  await db.collection('addresses').bulkWrite(bulkOps)
  stats.anonymize.addressesAnonymized = addresses.length
  console.log(`    Anonymized ${addresses.length} addresses.`)
  if (verbose) {
    console.log(`    (state and country fields preserved, customer refs preserved)`)
  }
}

async function anonymizeOrders(ctx: AnonymizeContext): Promise<void> {
  const { db, stats, verbose } = ctx

  const orders = await db.collection('orders').find({}).toArray()
  if (orders.length === 0) {
    console.log('    No orders to anonymize.')
    return
  }

  const bulkOps = orders.map((order) => {
    const seed = seedFromId(order._id)
    const person = fakePerson(seed)
    const address = fakeAddress(seed + 1)
    const phone = fakePhone(seed + 2)

    const customerEmail =
      order.customer && ctx.emailMap.get(order.customer.toString())

    return {
      updateOne: {
        filter: { _id: order._id },
        update: {
          $set: {
            'shippingAddress.firstName': person.firstName,
            'shippingAddress.lastName': person.lastName,
            'shippingAddress.company': fakeCompany(seed + 3),
            'shippingAddress.addressLine1': address.addressLine1,
            'shippingAddress.addressLine2': address.addressLine2,
            'shippingAddress.city': address.city,
            'shippingAddress.postalCode': address.postalCode,
            'shippingAddress.phone': phone,
            ...(customerEmail ? { customerEmail } : {}),
          },
          $unset: {
            trackingNumber: '',
            trackingUrl: '',
          },
        },
      },
    }
  })

  await db.collection('orders').bulkWrite(bulkOps)
  stats.anonymize.ordersAnonymized = orders.length
  console.log(`    Anonymized ${orders.length} orders.`)
  if (verbose) {
    console.log(`    (shippingAddress PII scrubbed, trackingNumber/Url nulled, state/country preserved)`)
  }
}

async function anonymizeTransactions(ctx: AnonymizeContext): Promise<void> {
  const { db, stats, verbose } = ctx

  const transactions = await db.collection('transactions').find({}).toArray()
  if (transactions.length === 0) {
    console.log('    No transactions to anonymize.')
    return
  }

  const bulkOps = transactions.map((txn) => {
    const seed = seedFromId(txn._id)
    const person = fakePerson(seed)
    const address = fakeAddress(seed + 1)
    const phone = fakePhone(seed + 2)

    const customerEmail =
      txn.customer && ctx.emailMap.get(txn.customer.toString())

    return {
      updateOne: {
        filter: { _id: txn._id },
        update: {
          $set: {
            'billingAddress.firstName': person.firstName,
            'billingAddress.lastName': person.lastName,
            'billingAddress.company': fakeCompany(seed + 3),
            'billingAddress.addressLine1': address.addressLine1,
            'billingAddress.addressLine2': address.addressLine2,
            'billingAddress.city': address.city,
            'billingAddress.postalCode': address.postalCode,
            'billingAddress.phone': phone,
            ...(customerEmail ? { customerEmail } : {}),
          },
          $unset: {
            'stripe.customerID': '',
            'stripe.paymentIntentID': '',
          },
        },
      },
    }
  })

  await db.collection('transactions').bulkWrite(bulkOps)
  stats.anonymize.transactionsAnonymized = transactions.length
  console.log(`    Anonymized ${transactions.length} transactions.`)
  if (verbose) {
    console.log(`    (billingAddress PII scrubbed, stripe.customerID/paymentIntentID nulled)`)
  }
}

async function anonymizeFormSubmissions(ctx: AnonymizeContext): Promise<void> {
  const { db, stats } = ctx

  const result = await db.collection('form-submissions').updateMany({}, [
    {
      $set: {
        submissionData: {
          $map: {
            input: { $ifNull: ['$submissionData', []] },
            as: 'item',
            in: { $mergeObjects: ['$$item', { value: '[REDACTED]' }] },
          },
        },
      },
    },
  ])

  stats.anonymize.formSubmissionsAnonymized = result.modifiedCount
  if (result.matchedCount === 0) {
    console.log('    No form submissions to anonymize.')
  } else {
    console.log(`    Redacted values in ${result.modifiedCount} form submissions.`)
  }
}

async function anonymizeForms(ctx: AnonymizeContext): Promise<void> {
  const { db, stats } = ctx

  const formsWithEmails = await db
    .collection('forms')
    .find({ emails: { $type: 'array', $ne: [] } })
    .toArray()

  if (formsWithEmails.length === 0) {
    console.log('    No form email configs to anonymize.')
    return
  }

  await db.collection('forms').updateMany(
    { emails: { $type: 'array' } },
    {
      $set: {
        'emails.$[].emailTo': 'dev@example.com',
        'emails.$[].emailFrom': 'dev@example.com',
      },
    },
  )

  await db.collection('forms').updateMany(
    { emails: { $type: 'array' } },
    {
      $unset: {
        'emails.$[].cc': '',
        'emails.$[].bcc': '',
        'emails.$[].replyTo': '',
      },
    },
  )

  stats.anonymize.formsAnonymized = formsWithEmails.length
  console.log(`    Anonymized email configs in ${formsWithEmails.length} forms.`)
}

async function anonymizeCarts(ctx: AnonymizeContext): Promise<void> {
  const { db, stats } = ctx

  const result = await db.collection('carts').updateMany(
    { secret: { $exists: true } },
    { $unset: { secret: '' } },
  )

  stats.anonymize.cartsScrubbed = result.modifiedCount
  if (result.matchedCount === 0) {
    console.log('    No cart secrets to scrub.')
  } else {
    console.log(`    Scrubbed secrets from ${result.modifiedCount} carts.`)
  }
}

async function dropStaleCollections(ctx: AnonymizeContext): Promise<void> {
  const { db, stats } = ctx
  const staleCollections = ['payload-locked-documents', 'payload-preferences']

  for (const name of staleCollections) {
    try {
      await db.collection(name).drop()
      stats.anonymize.collectionsDropped.push(name)
      console.log(`    Dropped stale collection: ${name}`)
    } catch (err: any) {
      if (err?.codeName === 'NamespaceNotFound') {
        continue
      }
      throw err
    }
  }
}
