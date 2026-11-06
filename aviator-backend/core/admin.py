from django.contrib import admin

from .models import (
    DepositOrder,
    DepositPayment,
    SiteSettings,
    SupportChat,
    SupportMessage,
    Transaction,
    UserProfile,
    WithdrawRequest,
)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("username", "firebase_uid", "platform_type", "fake_wallet_balance", "phone", "created_at")
    search_fields = ("username", "firebase_uid", "phone", "invite_code")
    list_filter = ("platform_type",)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "transaction_type", "amount", "status", "created_at")
    list_filter = ("transaction_type", "status")
    search_fields = ("user__username", "external_id")


@admin.register(DepositOrder)
class DepositOrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "amount_paise",
        "credits",
        "status",
        "payment_link_id",
        "razorpay_payment_id",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = ("payment_link_id", "razorpay_payment_id", "user__username")


@admin.register(DepositPayment)
class DepositPaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "razorpay_payment_id", "deposit_order", "user", "amount_paise", "method", "created_at")
    search_fields = ("razorpay_payment_id",)


@admin.register(WithdrawRequest)
class WithdrawRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "amount", "status", "payout_method", "upi_id", "created_at", "reviewed_at")
    list_filter = ("status", "payout_method")
    search_fields = ("user__username", "upi_id", "account_number", "account_name")


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    list_display = ("id", "min_deposit", "min_withdraw", "updated_at")


@admin.register(SupportChat)
class SupportChatAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "last_sender", "unread_for_admin", "last_message_at")
    list_filter = ("status",)
    search_fields = ("user__username", "user__email", "last_message")


@admin.register(SupportMessage)
class SupportMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "chat", "sender", "created_at")
    list_filter = ("sender",)
    search_fields = ("text",)
