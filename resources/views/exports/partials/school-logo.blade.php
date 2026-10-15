@php($logoPath = file_exists(public_path('brand/logo.png')) ? public_path('brand/logo.png') : (file_exists(public_path('brand/logo.jpg')) ? public_path('brand/logo.jpg') : null))
@if($logoPath)
<div style="text-align: center; margin-bottom: 6px;">
    <img src="data:{{ str_ends_with($logoPath, '.png') ? 'image/png' : 'image/jpeg' }};base64,{{ base64_encode(file_get_contents($logoPath)) }}" alt="" style="width: 54px; height: 54px;">
</div>
@endif
