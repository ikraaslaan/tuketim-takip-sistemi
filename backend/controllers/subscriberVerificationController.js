/**
 * Subscriber Verification Controller
 * 
 * Handles email verification flow for subscriber registration:
 * 1. Initiate: Generates code and sends email (only needs email and subscriber data)
 * 2. Verify: Validates code and returns success (subscriber creation happens in frontend)
 */

const verificationService = require('../services/verificationService');
const emailService = require('../services/emailService');
const Subscriber = require('../models/Subscriber');

/**
 * POST /api/verification/subscriber/initiate
 * 
 * Initiates the email verification process for subscribers.
 * Generates a verification code and sends it to the user's email.
 * 
 * Request body:
 *   - email: string (required)
 *   - name: string (required)
 *   - surname: string (required)
 *   - neighborhood: string (required)
 * 
 * Response:
 *   - success: boolean
 *   - message: string
 *   - email: string
 */
exports.initiateSubscriberVerification = async (req, res) => {
  try {
    const { email, name, surname, neighborhood } = req.body;

    // Validate input
    if (!email || !name || !surname || !neighborhood) {
      return res.status(400).json({
        success: false,
        message: 'E-posta adresi, ad, soyad ve mahalle gereklidir.'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir e-posta adresi giriniz.'
      });
    }

    // Check if email already exists as subscriber
    const existingSubscriber = await Subscriber.findOne({ email });
    if (existingSubscriber) {
      return res.status(400).json({
        success: false,
        message: 'Bu e-posta adresi zaten kayıtlı.'
      });
    }

    // Generate and store verification code with subscriber data
    const code = await verificationService.generateAndStoreCode(email, {
      type: 'subscriber',
      name,
      surname,
      email,
      neighborhood
    });

    // Send verification email (with timeout handling)
    try {
      await emailService.sendVerificationCode(email, code);
      
      // Ensure response is sent
      if (!res.headersSent) {
        res.status(200).json({
          success: true,
          message: 'Doğrulama kodu e-posta adresinize gönderildi.',
          email: email
        });
      }
    } catch (emailError) {
      console.error('Email sending error (but code generated):', emailError);
      // Code is already generated and stored, so we can still return success
      // The user can use the code even if email fails (in dev mode, code is logged)
      if (!res.headersSent) {
        res.status(200).json({
          success: true,
          message: 'Doğrulama kodu oluşturuldu. E-posta gönderiminde sorun olabilir, lütfen konsolu kontrol edin.',
          email: email,
          warning: 'E-posta gönderilemedi, ancak kod oluşturuldu.'
        });
      }
    }

  } catch (error) {
    console.error('Subscriber verification initiation error:', error);
    // Ensure response is sent in error case
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || 'Doğrulama kodu gönderilirken bir hata oluştu.'
      });
    }
  }
};

/**
 * POST /api/verification/subscriber/verify
 * 
 * Verifies the code for subscriber registration.
 * Returns success if code is valid (subscriber creation happens separately).
 * 
 * Request body:
 *   - email: string (required)
 *   - code: string (required)
 * 
 * Response:
 *   - success: boolean
 *   - message: string
 *   - subscriberData?: object (subscriber data if successful)
 */
exports.verifySubscriberCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    // Validate input
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'E-posta adresi ve doğrulama kodu gereklidir.'
      });
    }

    // Validate code
    const validation = await verificationService.validateCode(email, code);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error || 'Geçersiz doğrulama kodu.'
      });
    }

    // Code is valid - return subscriber data for frontend to use
    const subscriberData = validation.userData;

    // Verify it's a subscriber verification
    if (subscriberData.type !== 'subscriber') {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz doğrulama türü.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'E-posta doğrulandı. Abonelik oluşturulabilir.',
      subscriberData: {
        name: subscriberData.name,
        surname: subscriberData.surname,
        email: subscriberData.email,
        neighborhood: subscriberData.neighborhood
      }
    });

  } catch (error) {
    console.error('Subscriber verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Doğrulama sırasında bir hata oluştu.'
    });
  }
};

/**
 * POST /api/verification/subscriber/resend
 * 
 * Resends the verification code to the subscriber's email.
 * 
 * Request body:
 *   - email: string (required)
 * 
 * Response:
 *   - success: boolean
 *   - message: string
 */
exports.resendSubscriberCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'E-posta adresi gereklidir.'
      });
    }

    // Get stored data
    const stored = verificationService.getStoredData(email);

    if (!stored) {
      return res.status(400).json({
        success: false,
        message: 'Aktif bir doğrulama kodu bulunamadı. Lütfen kayıt işlemini tekrar başlatın.'
      });
    }

    // Resend the same code (with timeout handling)
    try {
      await emailService.sendVerificationCode(email, stored.code);
      
      if (!res.headersSent) {
        res.status(200).json({
          success: true,
          message: 'Doğrulama kodu tekrar gönderildi.'
        });
      }
    } catch (emailError) {
      console.error('Email resend error (but code exists):', emailError);
      // Code exists, so return success even if email fails
      if (!res.headersSent) {
        res.status(200).json({
          success: true,
          message: 'Doğrulama kodu mevcut. E-posta gönderiminde sorun olabilir.',
          warning: 'E-posta gönderilemedi, ancak kod hala geçerli.'
        });
      }
    }

  } catch (error) {
    console.error('Resend subscriber code error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message || 'Kod gönderilirken bir hata oluştu.'
      });
    }
  }
};

