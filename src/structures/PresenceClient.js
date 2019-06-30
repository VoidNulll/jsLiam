import { Client } from 'discord-rpc';
import EventEmitter from 'eventemitter3';

/**
 * @class PresenceClient
 *
 * A nice little layer class between you and discord-rpc
 *
 * @author VoidNulll
 * */
export class PresenceClient extends EventEmitter {
    /**
     *
     * @param {Object} [config] The base config.
     *
     * @prop {Object<Client>} client The discord-rpc client
     * @prop {Object} [config] config The base config
     * @prop {Object} aConf The actual configuration
     * @prop {Array<String>} _arrays The array of keys i allow to be arrays.
     * @prop {String} [cID] the client ID for the RPC client
     * @prop {Date} [oldTimestamp] The old timestamp for the presence
     *
     * */
    constructor(config) {
        super();
        this.client = new Client({ transport: 'ipc' });
        this.config = config;
        this.aConf = {};
        this._arrays = [
            'details',
            'largeImageKey',
            'smallImageKey',
            'largeImageText',
            'smallImageText',
            'state',
        ];
    }

    /**
     * Verifies configuration
     * @private
     *
     * @param {Object} [newConf=this.config] The optional new configuration
     *
     * @returns {Object} Verified config
     * @memberOf PresenceClient
     * */
    _verifyConf(newConf) {
        const arrays = this._arrays;
        const nConf = newConf || this.config;
        const conf = newConf || this.config;
        for (const key in this.config) {
            if (arrays.includes(key)) {
                if (!Array.isArray(nConf[key]) && typeof nConf[key] === 'string')
                    conf[key] = Array(nConf[key]);
                else if (Array.isArray(nConf[key]) && typeof nConf[key] === 'string')
                    delete conf[key];
            }
            else if (key === 'timestamp' && ![
                true,
                false,
                'now',
            ].includes(nConf[key])) {
                delete conf[key];
            }
            else if (key === 'partySize') {
                if (isNaN(nConf[key])) {
                    delete conf[key];
                    delete conf.maxPartySize;
                }
                else if (!conf.maxPartySize) {
                    delete conf[key];
                    delete conf.maxPartySize;
                }
                else if (nConf[key] > 100) {
                    conf[key] = 100;
                }
                else if (nConf[key] > conf.maxPartySize)
                    conf[key] = conf.maxPartySize;
            }
            else if (key === 'partyMax' && conf.partySize) {
                if (isNaN(nConf[key])) {
                    delete conf[key];
                    delete conf.partySize;
                }
                else if (nConf[key] > 100) {
                    conf[key] = 100;
                }
            }
            else if (key !== 'timestamp') {
                delete conf[key];
            }
        }
        this.config = conf;
        return this.config;
    }

    /**
     * Gets a random item from an array
     * @public
     *
     * @param {*|Array<*>} array The array to generate a random item from
     *
     * @returns {*} Random item
     * @memberOf PresenceClient
     */
    genRandom(array) {
        if (!Array.isArray(array))
            array = Array(array);
        const item = array[Math.floor(Math.random() * array.length)];
        return item;
    }

    /**
     * Get/set the actual configuration
     * @private
     *
     * @param {Object} newConf The new configuration to get
     *
     * @returns {Object} The config.
     * @memberOf PresenceClient
     */
    _getConf(newConf) {
        const nConf = {};
        const arrays = this._arrays;
        for (const key in newConf) {
            if (arrays.includes(key)) {
                nConf[key] = this.genRandom(newConf[key]);
            }
            else if (key === 'timestamp') {
                if (newConf[key] === 'now') {
                    nConf.startTimestamp = new Date();
                    this.oldTimestamp = new Date();
                }
                else if (newConf[key] === true) {
                    if (!this.oldTimestamp)
                        this.oldTimestamp = new Date();
                    nConf.startTimestamp = this.oldTimestamp;
                }
                else {
                    delete this.oldTimestamp;
                }
            }
            else
                nConf[key] = newConf[key];
        }
        this.aConf = nConf;
        return this.aConf;
    }

    /**
     * Sets the client presence
     * @public
     *
     * @param {Object} [newConf=this.config] The new config to set for
     *
     * @returns {Object<Activity>|void} new Activity or void
     * @memberOf PresenceClient
     */
    setPresence(newConf) {
        this.config = this._verifyConf();
        if (!newConf) {
            const eh = this._getConf(this.config);
            return this.client.setActivity(eh);
        }
        newConf = this._verifyConf(newConf);
        const conf = this.config;
        for (const key in newConf) {
            if (newConf[key] !== conf[key]) {
                conf[key] = newConf[key];
            }
        }
        for (const key in conf) {
            if (!newConf[key]) {
                delete conf[key];
            }
        }
        this.config = conf;
        this.aConf = this._getConf(this.config);
        return this.client.setActivity(this.aConf);
    }

    /**
     * Inits the client
     * @public
     *
     * @param {String} clientID The client ID to init for
     *
     * @memberOf PresenceClient
     */
    init(clientID) {
        this.cID = clientID;
        this.client.login({ clientId: this.cID });
        this.client.once('ready', this._onReady.bind(this));
    }

    /**
     * Private ready event to set the presence
     *
     * @returns {Object<Activity>|void}
     * @private
     */
    _onReady() {
        this.emit('ready');
        return this.setPresence();
    }
}

export default PresenceClient;
