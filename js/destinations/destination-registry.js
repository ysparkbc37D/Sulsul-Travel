/**
 * Sulsul-Travel Destination Knowledge Pack (DKP) Registry
 * Manages travel destination packs, intelligent trip matching, and dynamic fallback.
 * 100% Offline-First, Zero-Backend, No-Build compatible.
 */
(function() {
  'use strict';

  const _packs = [];
  let _defaultPack = null;

  const DestinationRegistry = {
    /**
     * Register a destination knowledge pack
     * @param {Object} pack - Must implement DestinationPack schema
     */
    register(pack) {
      if (!pack || !pack.id) {
        console.warn('[DKP Registry] Attempted to register invalid pack:', pack);
        return;
      }
      const existingIdx = _packs.findIndex(p => p.id === pack.id);
      if (existingIdx >= 0) {
        _packs[existingIdx] = pack;
      } else {
        _packs.push(pack);
      }
      console.log(`[DKP Registry] Registered pack: ${pack.name} (${pack.id})`);
    },

    /**
     * Set the global fallback pack
     */
    setDefaultPack(pack) {
      _defaultPack = pack;
    },

    /**
     * Retrieve all registered packs
     */
    getAll() {
      return [..._packs];
    },

    getAllPacks() {
      return this.getAll();
    },

    /**
     * Get a pack by its unique ID
     */
    get(packId) {
      return _packs.find(p => p.id === packId) || null;
    },

    /**
     * Resolve the best matching pack for a given trip object
     * @param {Object} trip - Trip model
     * @returns {Object} Matching DestinationPack or dynamically generated generic pack
     */
    resolve(trip) {
      if (!trip) {
        return _defaultPack ? _defaultPack.createDynamicPack(null) : null;
      }

      // Check registered packs in registration order
      for (const pack of _packs) {
        try {
          if (typeof pack.match === 'function' && pack.match(trip)) {
            return pack;
          }
        } catch (e) {
          console.error(`[DKP Registry] Error matching pack ${pack.id}:`, e);
        }
      }

      // If no pack matches, create a dynamic pack using default pack generator
      if (_defaultPack && typeof _defaultPack.createDynamicPack === 'function') {
        return _defaultPack.createDynamicPack(trip);
      }

      return null;
    }
  };

  // Expose globally
  window.DestinationRegistry = DestinationRegistry;
  if (!window.SulsulTravel) window.SulsulTravel = {};
  window.SulsulTravel.DestinationRegistry = DestinationRegistry;
})();
