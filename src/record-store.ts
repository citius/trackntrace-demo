import {observable} from "mobx";
import {IRawScanRecord, ScanRecord} from "./record";
import {GatewayConfig} from "./gateway-config";
import * as _ from "lodash";

export class RecordStore {

    @observable ready = false;
    @observable err: Error = null;

    @observable records: ScanRecord[] = [];

    constructor(private gatewayConfig: GatewayConfig, pollingIntervalMs = 1000) {
        this.init(pollingIntervalMs)
    }

    private async init(pollingIntervalMs: number) {
        try {
            const now = Date.now();
            await this.fetch();
            // const delay = Math.max(0, 800 - (Date.now() - now));
            const delay = 1;
            setTimeout(() => this.ready = true, delay);

            const f = async () => {
                try {
                    await this.fetch();
                    setTimeout(f, pollingIntervalMs)
                } catch (e) {
                    this.err = e;
                }
            };
            f();
        } catch (e) {
            this.err = e;
        }
    }

    public async fetch() {
        const res = await fetch(process.env.REACT_APP_RECORDS_URL || "https://png-collector.herokuapp.com/getAllEvents");
        const records: IRawScanRecord[] = await res.json();

        if (this.records == null || records.length != this.records.length) {
            this.records = records
                .filter(r => (r as any).msg != "[object Object]")
                .filter(r => Object.keys(r).map(k => k.toLowerCase()).find(x => x == "tagid"))
                .map(raw => new ScanRecord(raw, this.gatewayConfig));
            this.records = _.sortBy(this.records, r => r.timestampInMilliseconds());
        }
    }
}
