import { TrustedContact } from '../types/speakerFingerprint';
import { SecurityCrypto } from './securityCrypto';

const STORAGE_KEY = 'swaraksha_trusted_contacts';

export class TrustedContactsStore {
  static getContacts(): TrustedContact[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (_) {}

    // Seed with initial realistic contacts if empty
    const initial = this.getInitialSeeds();
    this.saveContacts(initial);
    return initial;
  }

  static saveContacts(contacts: TrustedContact[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
    } catch (_) {}
  }

  static getContactById(id: string): TrustedContact | undefined {
    return this.getContacts().find((c) => c.id === id);
  }

  static getContactByNameOrNumber(query: string): TrustedContact | undefined {
    const q = query.toLowerCase().trim();
    return this.getContacts().find(
      (c) => c.name.toLowerCase() === q || c.phoneNumber.replace(/\s+/g, '') === q.replace(/\s+/g, '')
    );
  }

  static saveContact(contact: TrustedContact): void {
    const contacts = this.getContacts();
    const idx = contacts.findIndex((c) => c.id === contact.id);
    if (idx >= 0) {
      contacts[idx] = contact;
    } else {
      contacts.push(contact);
    }
    this.saveContacts(contacts);
  }

  static deleteContact(id: string): void {
    const contacts = this.getContacts().filter((c) => c.id !== id);
    this.saveContacts(contacts);
  }

  private static getInitialSeeds(): TrustedContact[] {
    // Generate seeded speaker embedding for Amit
    const amitEmbedding = SecurityCrypto.generateEmbedding('Amit_Brother_Voice_Sample_128d', 0.02);

    // Initial pre-configured verification question for Amit (Answer: "Spice Garden" or "Chai Point")
    // Answer hash for "spice garden"
    return [
      {
        id: 'contact_amit',
        name: 'Amit',
        relationship: 'Brother',
        phoneNumber: '+91 98450 12345',
        createdAt: Date.now() - 86400000 * 14,
        speakerProfile: {
          contactId: 'contact_amit',
          embedding: amitEmbedding,
          enrolledAt: Date.now() - 86400000 * 10,
          sampleCount: 3,
          averageQuality: 0.94,
        },
        verificationQuestions: [
          {
            id: 'q1',
            question: 'What was the name of the restaurant we went to last month?',
            answerHash: 'c6ce5d57bfa3731a5a8f4c28f32386927d91dfefb3da450f38102ffebc439f01', // hash of "spice garden"
            hint: 'Spice Garden',
            createdAt: Date.now() - 86400000 * 10,
          },
          {
            id: 'q2',
            question: 'What is our childhood dog’s name?',
            answerHash: '1a525f385c290119b4cfb06df0e2cf0ee34d94dfceea96677f51950d877f8841', // hash of "bruno"
            hint: 'Bruno',
            createdAt: Date.now() - 86400000 * 10,
          },
          {
            id: 'q3',
            question: 'Where did we go on our last trip?',
            answerHash: 'b4ef898b9e6ff40cfd69ff006001099238e8ec43b17c24f6867a5be5332f14c2', // hash of "manali"
            hint: 'Manali',
            createdAt: Date.now() - 86400000 * 10,
          },
        ],
      },
      {
        id: 'contact_priya',
        name: 'Priya Sharma',
        relationship: 'Colleague',
        phoneNumber: '+91 98220 54321',
        createdAt: Date.now() - 86400000 * 7,
        verificationQuestions: [
          {
            id: 'pq1',
            question: 'What project did we both work on in Q2?',
            answerHash: 'e6371c1b97ab743eb352ffb6238b725c4e9766946779d71c430fa0bbcf9b9241', // "helios"
            hint: 'Helios',
            createdAt: Date.now() - 86400000 * 7,
          },
        ],
      },
    ];
  }
}
