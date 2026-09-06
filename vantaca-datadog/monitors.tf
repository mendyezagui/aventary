# monitors.tf — Datadog monitors for the Vantaca Slack bot (US1).
#
# Apply with the Datadog Terraform provider:
#   export DD_API_KEY=...        # an org API key
#   export DD_APP_KEY=...        # an application key
#   terraform init && terraform apply
#
# Or translate any monitor's `query` into the UI (Monitors → New → Metric).
# Set var.notify to your Slack/email handle list, e.g. "@slack-vantaca-alerts".

terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.39"
    }
  }
}

provider "datadog" {
  # US1 — the default. Reads DD_API_KEY / DD_APP_KEY from the environment.
  api_url = "https://api.datadoghq.com/"
}

variable "notify" {
  description = "Notification target(s) appended to each alert message."
  type        = string
  default     = "@here"
}

variable "env" {
  type    = string
  default = "prod"
}

locals {
  scope = "service:vantaca-slack-bot,env:${var.env}"
}

# 1) Daily cost spike — sum of per-request cost over the last hour.
resource "datadog_monitor" "cost_spike" {
  name    = "[Vantaca] Hourly Claude cost is high"
  type    = "query alert"
  message = <<-EOT
    Vantaca Slack bot spent {{value}} USD in the last hour (warn >$2, alert >$5).
    Check the Vantaca Controls dashboard and recent expensive requests.
    ${var.notify}
  EOT

  query = "sum(last_1h):sum:vantaca.request.cost_usd{${local.scope}}.as_count() > 5"

  monitor_thresholds {
    critical = 5
    warning  = 2
  }

  tags                = ["service:vantaca-slack-bot", "env:${var.env}", "team:aventary"]
  notify_no_data      = false
  renotify_interval   = 60
  require_full_window = false
}

# 2) Error / stop rate — share of requests stopped or errored in last 30m.
resource "datadog_monitor" "error_rate" {
  name    = "[Vantaca] High error / stop rate"
  type    = "query alert"
  message = <<-EOT
    More than {{threshold}}% of Vantaca requests stopped or errored in the last 30m
    (current: {{value}}%). Likely over-budget caps or MCP/API failures.
    ${var.notify}
  EOT

  # (stopped + error) / total, as a percentage.
  query = <<-Q
    sum(last_30m):( default_zero(sum:vantaca.request.stopped{${local.scope}}.as_count())
                  + default_zero(sum:vantaca.request.error{${local.scope}}.as_count()) )
                  / default_zero(sum:vantaca.request.count{${local.scope}}.as_count()) * 100 > 25
  Q

  monitor_thresholds {
    critical = 25
    warning  = 10
  }

  tags                = ["service:vantaca-slack-bot", "env:${var.env}", "team:aventary"]
  notify_no_data      = false
  renotify_interval   = 60
  require_full_window = false
}

# 3) Write-verification failures — any write the bot could not verify.
resource "datadog_monitor" "write_verify_fail" {
  name    = "[Vantaca] Unverified / failed Vantaca writes"
  type    = "query alert"
  message = <<-EOT
    {{value}} Vantaca write(s) failed verification in the last 30m. A write to the
    Vantaca API may not have landed — inspect the affected request's writes[].
    ${var.notify}
  EOT

  query = "sum(last_30m):sum:vantaca.write.failed{${local.scope}}.as_count() > 0"

  monitor_thresholds {
    critical = 0 # any failed write pages
  }

  tags                = ["service:vantaca-slack-bot", "env:${var.env}", "team:aventary"]
  notify_no_data      = false
  renotify_interval   = 120
  require_full_window = false
}

# 4) Bot paused too long — paused gauge stuck at 1 for 2h.
resource "datadog_monitor" "paused_too_long" {
  name    = "[Vantaca] Bot has been PAUSED for 2h+"
  type    = "query alert"
  message = <<-EOT
    The Vantaca Slack bot has been paused for over 2 hours and is refusing
    requests. Resume it from the Second Brain → Vantaca Controls page if this
    was not intentional.
    ${var.notify}
  EOT

  query = "min(last_2h):min:vantaca.bot.paused{${local.scope}} >= 1"

  monitor_thresholds {
    critical = 1
  }

  tags                = ["service:vantaca-slack-bot", "env:${var.env}", "team:aventary"]
  notify_no_data      = false
  renotify_interval   = 0
  require_full_window = true
}
