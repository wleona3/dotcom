defmodule Feedback.Mailer do
  @moduledoc "Module to send a HEAT ticket and some previous pre-processing of the data received from the customer support form"

  require Logger

  alias Feedback.Message

  @spec send_heat_ticket(Message.t(), [map()]) :: {:ok, any} | {:error, any}
  def send_heat_ticket(message, photo_info) do
    no_request_response = if message.no_request_response, do: "No", else: "Yes"

    _ =
      unless message.no_request_response do
        Logger.info("HEAT Ticket submitted by #{format_email(message.email)}")
      end

    first_name = format_name(message.first_name, "Riding")
    last_name = format_name(message.last_name, "Public")
    full_name = "#{first_name} #{last_name}"

    body = """
    <INCIDENT>
      <SERVICE>#{message.service}</SERVICE>
      <CATEGORY>#{message.subject}</CATEGORY>
      <TOPIC>#{topic(message)}</TOPIC>
      <SUBTOPIC></SUBTOPIC>
      <MODE>#{message.mode}</MODE>
      <LINE>#{message.line}</LINE>
      <STATION></STATION>
      <INCIDENTDATE>#{formatted_utc_timestamp(message.incident_date_time)}</INCIDENTDATE>
      <VEHICLE>#{message.vehicle}</VEHICLE>
      <FIRSTNAME>#{first_name}</FIRSTNAME>
      <LASTNAME>#{last_name}</LASTNAME>
      <FULLNAME>#{full_name}</FULLNAME>
      <CITY></CITY>
      <STATE></STATE>
      <ZIPCODE></ZIPCODE>
      <EMAILID>#{format_email(message.email)}</EMAILID>
      <PHONE>#{message.phone}</PHONE>
      <DESCRIPTION>#{ticket_number(message)}#{message.comments}</DESCRIPTION>
      <CUSTREQUIRERESP>#{no_request_response}</CUSTREQUIRERESP>
      <MBTASOURCE>Auto Ticket 2</MBTASOURCE>
    </INCIDENT>
    """

    message =
      if photo_info do
        photo_info
        |> Enum.reduce(
          Mail.build_multipart(),
          fn attachment, message -> Mail.put_attachment(message, attachment) end
        )
      else
        Mail.build()
      end

    message =
      message
      |> Mail.put_to(Application.get_env(:feedback, :support_ticket_to_email))
      |> Mail.put_from(Application.get_env(:feedback, :support_ticket_from_email))
      |> Mail.put_subject("MBTA Customer Comment Form")
      |> Mail.put_text(body)

    exaws_config_fn = Application.get_env(:feedback, :exaws_config_fn, &ExAws.Config.new/1)

    exaws_perform_fn =
      Application.get_env(:feedback, :exaws_perform_fn, &ExAws.Operation.perform/2)

    message
    |> Mail.Renderers.RFC2822.render()
    |> ExAws.SES.send_raw_email()
    |> exaws_perform_fn.(exaws_config_fn.(:ses))
  end

  @spec topic(Message.t()) :: String.t()
  defp topic(%Message{service: "Complaint", subject: "Bus Stop"}), do: "Other"
  defp topic(%Message{service: "Complaint", subject: "CharlieCards & Tickets"}), do: "Other"
  defp topic(%Message{service: "Complaint", subject: "Employee Complaint"}), do: "Other"
  defp topic(%Message{service: "Complaint", subject: "Fare Evasion"}), do: "Other"
  defp topic(%Message{service: "Complaint", subject: "Maintenance Complaint"}), do: "Other"
  defp topic(%Message{service: "Complaint", subject: "Parking"}), do: "Other"
  defp topic(%Message{service: "Complaint", subject: "Service Complaint"}), do: "Other"
  defp topic(%Message{service: "Complaint", subject: "TAlerts/Countdowns/Apps"}), do: "Other"
  defp topic(%Message{service: "Inquiry", subject: "Disability ID Cards"}), do: "Other"
  defp topic(%Message{service: "Inquiry", subject: "Senior ID Cards"}), do: "Other"
  defp topic(_), do: ""

  @spec format_name(String.t() | nil, String.t()) :: String.t()
  defp format_name(nil, default) do
    default
  end

  defp format_name(name, default) do
    case String.trim(name) do
      "" -> default
      name -> name
    end
  end

  defp format_email(nil) do
    Application.get_env(:feedback, :support_ticket_reply_email)
  end

  defp format_email(email) do
    case String.trim(email) do
      "" -> Application.get_env(:feedback, :support_ticket_reply_email)
      email -> email
    end
  end

  def formatted_utc_timestamp(date) do
    date
    |> Timex.Timezone.convert("Etc/UTC")
    |> Timex.format!("{0M}/{0D}/{YYYY} {h24}:{m}")
  end

  defp ticket_number(%Message{
         service: "Complaint",
         subject: "CharlieCards & Tickets",
         ticket_number: ticket_number
       }),
       do: """
       CharlieCard or Ticket number: #{ticket_number}

       """

  defp ticket_number(_), do: nil
end
