const axios = require('axios');
const converter = require('json-2-csv');
const fs = require('fs');
const moment = require('moment');

const cookie ='<<ADD JSESSION COOKIE>>';

let endDate = '';
// let endDate = '2020-12-01T14%3A31%3A07.000Z';

let getHistoryUrl = '';
const orderUrl = 'https://live.trading212.com/rest/history';
const orders = [];
const orderToGet = [];
let section = [];
const exportToCsv = async () => {
    // DATA A PARTIR DA QUAL FICA NO FICHEIRO
    let startDate = moment("2020-01-04");
    try {
        do {
            getHistoryUrl = `https://live.trading212.com/rest/history/orders`;
            console.log('getHistoryUrl :>> ', getHistoryUrl);

            const response = await axios.get(getHistoryUrl, {
                headers: {
                    Cookie: cookie,
                },
                params: {
                    olderThan: endDate,
                    newerThan: '',
                    frontend: 'WC4',
                    filtered: false,
                },
            });
            section = response.data.data;
            for (let i = 0; i < section.length; i++) {
                const element = section[i];
                if (element.heading.key === 'history.instrument') {

                    if(element.additionalInfo.key === 'history.order.status.cancelled') continue;
                    orderToGet.push({
                        ticker: element.heading.context.instrument,
                        path: element.detailsPath,
                        date: element.date,
                        sharePrecision:
                            element.subHeading.context.quantityPrecision,
                        shares: element.subHeading.context.quantity,
                        amountPrecision:
                            element.subHeading.context.amountPrecision,
                        totalAmount: element.subHeading.context.amount,
                        type:
                            element.subHeading.key ===
                            'history.order.filled.buy'
                                ? 'Buy'
                                : 'Sell',
                    });
                }
            }
            if (section.length > 0) endDate = section[section.length - 1].date;
            // endDate = orderToGet[orderToGet.length - 1].date
            //     .replace(/:/g, '%3A')
            //     .replace('+', '%3B');
            console.log(endDate);
        } while (section.length > 0);

        /**
         * 2020-11-30T16:32:59+02:00
         * 2020-11-30T16:32:59+02:00
         *
         */
        for (let i = 0; i < orderToGet.length; i++) {
            let orderObj = {};
            const path = orderToGet[i].path;
            const ticker = orderToGet[i].ticker;
            console.log('`${orderUrl}${path}` :>> ', `${orderUrl}${path}`);
            const data = await axios.get(`${orderUrl}${path}`, {
                headers: {
                    Cookie: cookie,
                },
            });
            sections = data.data.sections;
            sections.forEach((section) => {
                const rows = section.rows;
                rows.forEach((row) => {
                    if (
                        row.description.key === 'history.details.order.id.key'
                    ) {
                        orderObj.id = row.value.context.id;
                    }
                    if (
                        row.description.key ===
                        'history.details.order.fill.price.key'
                    ) {
                        orderObj.shareValue = row.value.context.amount;
                        orderObj.shareValuePrecision =
                            row.value.context.amountPrecision;
                    }

                    if (
                        row.description.key ===
                        'history.details.order.exchange-rate.key'
                    ) {
                        orderObj.transaction_currency =
                            row.description.context.instrumentCurrencyIso;
                        orderObj.exchangeRate = row.value.context.quantity;
                        orderObj.exchangeRatePrecision =
                            row.value.context.quantityPrecision;
                    }
                });
            });
            if (!orderObj.transaction_currency)
                orderObj.transaction_currency = 'EUR';
            if (!orderObj.exchangeRate) orderObj.exchangeRate = 1;
            if (!orderObj.exchangeRatePrecision)
                orderObj.exchangeRatePrecision = 0;
            orderObj.finalCurrency = 'EUR';
            orderObj = { ...orderObj, ...orderToGet[i] };
            if (orderObj.transaction_currency != orderObj.finalCurrency) {
                orderObj.exchangeShareValue =
                    parseFloat(orderObj.shareValue).toFixed(
                        orderObj.shareValuePrecision
                    ) /
                    parseFloat(orderObj.exchangeRate).toFixed(
                        orderObj.exchangeRatePrecision
                    );
                orderObj.shareAmountValue =
                    parseFloat(orderObj.shareValue).toFixed(
                        orderObj.shareValuePrecision
                    ) *
                    parseFloat(orderObj.shares).toFixed(
                        orderObj.sharePrecision
                    );
            } else {
                orderObj.exchangeShareValue = orderObj.shareValue;
                orderObj.shareAmountValue = orderObj.shareValue;
            }

            orderObj.date = moment(
                sections[0].rows[2].value.context.date
            ).format('YYYY/MM/DD');
            var objDate = moment(orderObj.date)
            if(objDate >= startDate) orders.push(orderObj);
            // console.log(JSON.stringify(sections));
            // let currency_amount = 0;
            // let exchangeValue = 0;
            // const transaction_currency =
            //     sections[2].rows[2].value.context.currency;
            // if (transaction_currency === 'EUR') {
            //     exchangeRate = 1;
            // } else {
            //     exchangeRate = sections[2].rows[4].value.context.quantity;
            // }

            // if (
            //     sections[2].rows[1].value.context.quantity &&
            //     sections[2].rows[2].value.context.amount
            // ) {
            //     currency_amount =
            //         parseFloat(
            //             sections[2].rows[1].value.context.quantity
            //         ).toFixed(10) *
            //         parseFloat(
            //             sections[2].rows[2].value.context.amount
            //         ).toFixed(100);
            // }

            // orders.push({
            //     ticker,
            //     type:
            //         sections[0].rows[0].value.key ===
            //         'history.details.order.market.buy'
            //             ? 'Buy'
            //             : 'Sell',
            //     date:
            //     ),
            //     shares: sections[2].rows[1].value.context.quantity,
            //     value: sections[2].rows[2].value.context.amount,
            //     currency_amount,
            //     transaction_currency,
            //     exchangeRate,
            //     exchangeAmount: sections[1].rows[0].value.context.amount,
            //     exchangeValue,
            //     exchangeCurrency: 'EUR',
            // });

            // Get last date
            // const lastDate =
        }

        // console.log(orders);
        converter.json2csv(orders, (err, csv) => {
            console.log(csv);

            const filename = `./export_t212_${moment().format('YYYYMMDD')}.csv`;
            fs.writeFile(filename, csv, function (err) {
                if (err) return console.log(err);
            });
        });
        // console.log(orderToGet);
    } catch (error) {
        console.error(error);
    }
};

exportToCsv();
