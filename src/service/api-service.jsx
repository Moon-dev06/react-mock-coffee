import axios from "axios";

class ApiService {
  constructor() {
    this.accessToken = null;

    this.apiClient = axios.create({
      baseURL: process.env.REACT_APP_BASE_URL,
      // baseURL: "/api-proxy",
      timeout: 15000,
    });

    this.logClient = axios.create({
      baseURL: process.env.REACT_APP_LOG_URL,
      timeout: 5000,
    });

    this._setupInterceptors();
  }

  _setupInterceptors() {
    // REQUEST interceptor
    this.apiClient.interceptors.request.use((config) => {
      // แนบ token ยกเว้น gettoken endpoint
      if (this.accessToken && !config.url?.includes("gettoken")) {
        config.headers["Authorization"] = `Bearer ${this.accessToken}`;
      }

      // สร้าง requestId เหมือน flutter-{timestamp}
      const requestId = `react-${Date.now()}`;
      config.metadata = { requestId };

      console.log(
        `[${config.method?.toUpperCase()}] ${config.baseURL}${config.url}`,
      );
      console.log("✅ BASE_URL--CP:", process.env.REACT_APP_BASE_URL);

      // ยิง log → /logs/request (fire-and-forget เหมือน Flutter)
      this._sendLog("/logs/request", {
        id: requestId,
        method: config.method?.toUpperCase(),
        url: `${config.baseURL}${config.url}`,
        headers: config.headers,
        body: config.data ?? null,
      });

      return config;
    });

    this.apiClient.interceptors.response.use(
      (response) => {
        const requestId = response.config.metadata?.requestId;

        this._sendLog("/logs/response", {
          id: requestId,
          url: `${response.config.baseURL}${response.config.url}`,
          statusCode: response.status,
          response: response.data,
        });

        return response;
      },
      (error) => {
        const requestId = error.config?.metadata?.requestId;

        this._sendLog("/logs/response", {
          id: requestId,
          url: error.config
            ? `${error.config.baseURL}${error.config.url}`
            : "unknown",
          statusCode: error.response?.status ?? 0,
          message: error.message,
          response: error.response?.data ?? null,
        });

        return Promise.reject(error);
      },
    );
  }

  async getToken() {
    try {
      const res = await this.apiClient.get("/v2/payment/gettoken", {
        headers: {
          "x-api-key": process.env.REACT_APP_X_API_KEY,
          channel: "CH11",
        },
      });

      console.log("✅ Get Token Success:", res.data);

      this.accessToken = res.data?.result?.payload?.access_token ?? null;
      return this.accessToken;
    } catch (e) {
      console.error("❌ Get Token Error:", e.response?.data ?? e.message);
      return null;
    }
  }

  async inquiryPayment(amount, storedToken) {
    try {
      const channel = process.env.REACT_APP_CHANNEL;
      return await this.apiClient.post(
        "/payment/inquiryqrpayment",
        {
          jsonrpc: "2.0",
          result: {
            channelinfo: { channel },
            payload: {
              store_id: "00120",
              payment_type: "promptpaycb",
              method: "inquiry",
              payments: [{ tender_type: "promptpaycb", amount }],
            },
          },
          id: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${storedToken}`,
            channel,
          },
        },
      );
    } catch (e) {
      console.error("❌ Inquiry Error:", e);
      return null;
    }
  }

  async processPayment({
    item,
    totalPrice,
    transId,
    formattedDate,
    storedInquiryPayload,
    storedToken,
  }) {
    try {
      const channel = process.env.REACT_APP_CHANNEL;
      return await this.apiClient.post(
        "/payment/payment",
        {
          jsonrpc: "2.0",
          result: {
            channelinfo: { channel },
            payload: {
              storeid: "00120",
              saledate: formattedDate,
              products: [
                {
                  name: item.productName,
                  code: item.productCode,
                  barcode: item.barcode,
                  unitprice: totalPrice,
                  pma: item.pmaCode,
                  cat: item.catPma,
                  subcat: item.subcatPma,
                  qty: 1,
                  image_url: "",
                  business_unit: item.businessUnit,
                  service_type: item.serviceType,
                  onetouch_code: item.onetouchCode,
                  onetouch_name: item.productShortName,
                  promotion_type_no: item.promotionTypeNo,
                  hqprice: totalPrice,
                },
              ],
              premiums: [],
              subtotal_amount: totalPrice,
              discount_amount: 0,
              total_amount: totalPrice,
              payments: [
                {
                  tender_type: "promptpaycb",
                  receive_amount: totalPrice,
                  change_amount: 0,
                  barcode: "POSONL001201120260212114827508",
                  hq_data: storedInquiryPayload,
                },
              ],
              redeems: {},
              issue: { stamp_type: "mstamp" },
              tel_no: "",
              member_id: "",
              reference_id: transId,
              trans_id: transId,
              coupons: [],
              cashier_info: {
                employee_id: "0000000",
                name: "abc",
                last_name: "def",
                display_name: "0000000",
              },
              local_segments: [],
              isApplyAccum: false,
            },
          },
          id: 0,
        },
        {
          headers: {
            Authorization: `Bearer ${storedToken}`,
            channel,
          },
        },
      );
    } catch (e) {
      console.error("❌ Payment Error:", e);
      return null;
    }
  }

  async checkPaymentStatus({ transId, storedToken }) {
    try {
      const channel = process.env.REACT_APP_CHANNEL;
      return await this.apiClient.get("/payment/checkpaymenttransaction", {
        params: {
          store_id: "00120",
          reference_id: transId,
          channel,
          trans_id: transId,
        },
        headers: {
          Authorization: `Bearer ${storedToken}`,
          channel,
        },
      });
    } catch (e) {
      console.error("❌ Check Status Error:", e);
      return null;
    }
  }

  _sendLog(path, log) {
    this.logClient.post(path, log).catch((e) => {
      console.warn(`Send Log Error to ${path}:`, e.message);
    });
  }
}

// singleton เหมือน `final apiService = ApiService();` ใน Flutter
export const apiService = new ApiService();