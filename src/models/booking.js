/**
 * Booking data models for Maersk rate extraction
 */

export class Location {
    constructor({ city, country, isPort = false }) {
        this.city = city;
        this.country = country;
        this.isPort = isPort;
    }

    toString() {
        return `${this.city}, ${this.country}`;
    }
}

export class Container {
    constructor({ type, size, quantity, weightKg }) {
        this.type = type; // DRY, REEFER, etc.
        this.size = size; // 20, 40
        this.quantity = quantity;
        this.weightKg = weightKg;
    }
}

export class InlandTransport {
    constructor({ type, isPickup }) {
        this.type = type; // SD (Store Door), CY (Container Yard)
        this.isPickup = isPickup;
    }
}

export class BookingDetails {
    constructor({
        origin,
        destination,
        originTransport,
        destinationTransport,
        containers,
        commodity,
        readyDate,
        requiresTemperatureControl = false,
        isDangerousCargo = false,
        isPriceOwner = true
    }) {
        this.origin = origin;
        this.destination = destination;
        this.originTransport = originTransport;
        this.destinationTransport = destinationTransport;
        this.containers = containers;
        this.commodity = commodity;
        this.readyDate = readyDate;
        this.requiresTemperatureControl = requiresTemperatureControl;
        this.isDangerousCargo = isDangerousCargo;
        this.isPriceOwner = isPriceOwner;
    }

    validate() {
        const errors = [];

        if (!this.origin || !this.origin.city || !this.origin.country) {
            errors.push('Origin location is required');
        }

        if (!this.destination || !this.destination.city || !this.destination.country) {
            errors.push('Destination location is required');
        }

        if (!this.containers || this.containers.length === 0) {
            errors.push('At least one container is required');
        }

        if (!this.commodity || this.commodity.trim() === '') {
            errors.push('Commodity is required');
        }

        if (!this.readyDate) {
            errors.push('Ready date is required');
        }

        return errors;
    }
}

// Helper function to create sample booking data
export function createSampleBooking() {
    return new BookingDetails({
        origin: new Location({
            city: "Houston (Texas)",
            country: "United States",
            isPort: true
        }),
        destination: new Location({
            city: "Iquique",
            country: "Chile",
            isPort: true
        }),
        originTransport: new InlandTransport({
            type: "SD",
            isPickup: true
        }),
        destinationTransport: new InlandTransport({
            type: "SD",
            isPickup: false
        }),
        containers: [
            new Container({
                type: "DRY",
                size: "20",
                quantity: 1,
                weightKg: 4000
            })
        ],
        commodity: "Electronics",
        readyDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        requiresTemperatureControl: false,
        isDangerousCargo: false,
        isPriceOwner: true
    });
} 