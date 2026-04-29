/**
 * Repository factory — single swap-point for provider migration.
 *
 * To migrate to a different backend: replace the InsForge* imports below
 * with new implementations that satisfy the same domain interfaces.
 * Hooks, components and pages never import from infrastructure directly.
 */
import { InsForgeServiceRepository }     from './insforge/serviceRepository'
import { InsForgeBarberRepository }      from './insforge/barberRepository'
import { InsForgeScheduleRepository }    from './insforge/scheduleRepository'
import { InsForgeShopRepository }        from './insforge/shopRepository'
import { InsForgeAppointmentRepository } from './insforge/appointmentRepository'
import { InsForgeLoyaltyRepository }     from './insforge/loyaltyRepository'
import { InsForgeProfileRepository }     from './insforge/profileRepository'

export const repositories = {
  services:     () => new InsForgeServiceRepository(),
  barbers:      () => new InsForgeBarberRepository(),
  schedule:     () => new InsForgeScheduleRepository(),
  shop:         () => new InsForgeShopRepository(),
  appointments: () => new InsForgeAppointmentRepository(),
  loyalty:      () => new InsForgeLoyaltyRepository(),
  profiles:     () => new InsForgeProfileRepository(),
}
