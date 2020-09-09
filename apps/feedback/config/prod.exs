use Mix.Config

config :feedback,
  support_ticket_to_email: System.get_env("SUPPORT_TICKET_TO_EMAIL"),
  support_ticket_from_email: System.get_env("SUPPORT_TICKET_FROM_EMAIL"),
  support_ticket_reply_email: System.get_env("SUPPORT_TICKET_REPLY_EMAIL")
