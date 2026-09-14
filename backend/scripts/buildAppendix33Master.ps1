# Builds backend/templates/EARIST_Appendix33.xlsm from the source EARIST payroll workbook.
#
# Row insertion is driven through Excel itself (COM) rather than by rewriting the
# package XML, so Excel is the one that expands the SUM ranges, shifts merged cells,
# re-anchors drawings and moves print areas. Requires desktop Excel on Windows.
#
#   powershell -ExecutionPolicy Bypass -File backend/scripts/buildAppendix33Master.ps1 `
#       -Source "C:\path\to\TEMPLATE.xlsm"
#
# Safe to re-run: it never writes to -Source, only to -Out.

param(
    [string]$Source = "C:\Users\Admin\Downloads\TEMPLATE.xlsm",
    [string]$Out    = "$PSScriptRoot\..\templates\EARIST_Appendix33.xlsm"
)

$ErrorActionPreference = 'Stop'

$xlShiftDown                     = -4121
$xlOpenXMLWorkbookMacroEnabled   = 52
$msoAutomationSecurityForceDisable = 3

# Geometry, verified against the January 2026 workbook. Given the WTAX subtotal row W:
#   capacity C   = W - 8      (WTAX employee rows are 8 .. W-1)
#   PAY subtotal = W + 14     (PAY employee rows are 21 .. W+13, one spare beyond C)
#   DEDS subtotal= W + 13     (DEDS employee rows are 20 .. W+12, one spare beyond C)
$WTAX_FIRST = 8
$PAY_FIRST  = 21
$DEDS_FIRST = 20

$DEPTS = @('GEN.AD','AUX','CEN','CIT','CBPA','CAS','CAFA','CED','PE','RESEARCH','EXTENSION','TEMPO','CONTRACTUAL')

# Input columns wiped so no data from the source period survives into the master.
# Everything else on these rows is a formula and is left alone.
$WTAX_INPUT_COLS = @('C','D','E','F','H','J','L')
$PAY_INPUT_COLS  = @('F','G','H')
$DEDS_INPUT_COLS = @('H','I','J','K','L','M','N','O','P','Q','S','T','U','V','W','Z','AA','AB','AC','AD')

function Get-TargetCapacity([int]$current) {
    $grown = [math]::Ceiling($current * 1.5)
    $floor = $current + 10
    if ($grown -gt $floor) { return [int]$grown }
    return [int]$floor
}

function Find-SubtotalRow($ws, [string]$col, [int]$firstDataRow) {
    $needle = "=SUM($col$firstDataRow" + ":"
    $colIndex = $ws.Range("${col}1").Column
    for ($r = $firstDataRow; $r -le $firstDataRow + 400; $r++) {
        $f = $ws.Cells.Item($r, $colIndex).Formula
        if ($f -and $f.StartsWith($needle)) { return $r }
    }
    throw "Could not locate subtotal row starting '$needle' on sheet '$($ws.Name)'"
}

function Insert-PaddedRows($ws, [int]$copyRow, [int]$count) {
    # Copying the last real employee row and inserting over it keeps the new rows
    # inside the existing SUM range, so Excel widens the range instead of orphaning it.
    $ws.Rows.Item($copyRow).Copy() | Out-Null
    $last = $copyRow + $count - 1
    $ws.Range("${copyRow}:${last}").Insert($xlShiftDown) | Out-Null
}

function Clear-Clipboard($xl) {
    # The typed interop wrapper rejects 0 for XlCutCopyMode, so set it late-bound.
    [void]$xl.GetType().InvokeMember('CutCopyMode', 'SetProperty', $null, $xl, @(0))
}

if (-not (Test-Path $Source)) { throw "Source workbook not found: $Source" }
$outDir = Split-Path -Parent $Out
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }
$Out = [System.IO.Path]::GetFullPath($Out)

Write-Host "Source : $Source"
Write-Host "Output : $Out"
Write-Host ""

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
$xl.AskToUpdateLinks = $false
$xl.AutomationSecurity = $msoAutomationSecurityForceDisable

$wb = $null
try {
    $wb = $xl.Workbooks.Open($Source, 0, $true)   # UpdateLinks=0, ReadOnly=$true
    $summary = @()

    foreach ($d in $DEPTS) {
        $wsW = $wb.Worksheets.Item("WTAX-$d")
        $wsP = $wb.Worksheets.Item("$d - PAY")
        $wsD = $wb.Worksheets.Item("$d - DEDS")

        $wtaxSub = Find-SubtotalRow $wsW 'F' $WTAX_FIRST
        $paySub  = Find-SubtotalRow $wsP 'F' $PAY_FIRST
        $dedsSub = Find-SubtotalRow $wsD 'F' $DEDS_FIRST

        if ($paySub -ne $wtaxSub + 14) { throw "$d PAY subtotal $paySub != WTAX subtotal $wtaxSub + 14" }
        if ($dedsSub -ne $wtaxSub + 13) { throw "$d DEDS subtotal $dedsSub != WTAX subtotal $wtaxSub + 13" }

        $cap    = $wtaxSub - $WTAX_FIRST
        $target = Get-TargetCapacity $cap
        $n      = $target - $cap

        # Last row of the aligned employee block on each sheet.
        Insert-PaddedRows $wsW ($WTAX_FIRST + $cap - 1) $n
        Insert-PaddedRows $wsP ($PAY_FIRST  + $cap - 1) $n
        Insert-PaddedRows $wsD ($DEDS_FIRST + $cap - 1) $n
        Clear-Clipboard $xl

        $newWtaxSub = Find-SubtotalRow $wsW 'F' $WTAX_FIRST
        $newPaySub  = Find-SubtotalRow $wsP 'F' $PAY_FIRST
        $newDedsSub = Find-SubtotalRow $wsD 'F' $DEDS_FIRST
        $newCap     = $newWtaxSub - $WTAX_FIRST

        if ($newCap -ne $target)              { throw "$d capacity is $newCap, expected $target" }
        if ($newPaySub -ne $newWtaxSub + 14)  { throw "$d PAY subtotal drifted to $newPaySub" }
        if ($newDedsSub -ne $newWtaxSub + 13) { throw "$d DEDS subtotal drifted to $newDedsSub" }

        # Wipe every input cell so the master carries no period data.
        $wtaxLast = $WTAX_FIRST + $newCap - 1
        $payLast  = $PAY_FIRST  + $newCap        # includes the spare row
        $dedsLast = $DEDS_FIRST + $newCap        # includes the spare row
        foreach ($c in $WTAX_INPUT_COLS) { $wsW.Range("$c$WTAX_FIRST" + ":" + "$c$wtaxLast").ClearContents() | Out-Null }
        foreach ($c in $PAY_INPUT_COLS)  { $wsP.Range("$c$PAY_FIRST"  + ":" + "$c$payLast" ).ClearContents() | Out-Null }
        foreach ($c in $DEDS_INPUT_COLS) { $wsD.Range("$c$DEDS_FIRST" + ":" + "$c$dedsLast").ClearContents() | Out-Null }

        $summary += [pscustomobject]@{
            dept = $d; was = $cap; now = $newCap; added = $n
            wtaxSubtotal = $newWtaxSub; paySubtotal = $newPaySub; dedsSubtotal = $newDedsSub
        }
        Write-Host ("  {0,-12} capacity {1,3} -> {2,3}  (+{3})  subtotals W{4} P{5} D{6}" -f $d, $cap, $newCap, $n, $newWtaxSub, $newPaySub, $newDedsSub)
    }

    if (Test-Path $Out) { Remove-Item $Out -Force }
    $wb.SaveAs($Out, $xlOpenXMLWorkbookMacroEnabled)
    Write-Host ""
    Write-Host "Wrote $Out"
    $summary | ConvertTo-Json -Compress | Write-Host
}
finally {
    if ($wb) { $wb.Close($false) | Out-Null }
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
    [GC]::Collect()
}
